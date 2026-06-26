import os
from fastapi import APIRouter, Depends, HTTPException, Request
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from config.blockchain import blockchain_config
from config.database import database
from middleware.auth import get_current_user
from services.blockchain_service import blockchain_service
from services.points_service import get_points_for_user, record_borrow_approved, record_return
from services.notification_service import create_notification, sync_user_notifications
from utils.asset_utils import get_stock_state, is_asset_available

router = APIRouter(prefix="/api/borrow", tags=["borrow"])


def _resolve_borrower_id(doc: dict) -> str | None:
    """Normalize borrower ID from legacy/alternate field names and types."""
    raw = doc.get("borrower_id") or doc.get("borrowerId") or doc.get("user_id")
    if raw is None:
        return None
    return str(raw).strip()


def serialize_borrow(doc):
    doc = dict(doc)
    doc["_id"] = str(doc.get("_id"))
    doc["id"] = str(doc.get("_id"))
    doc["assetId"] = doc.get("asset_id")
    doc["assetName"] = doc.get("assetName") or doc.get("asset_name") or "Unknown Asset"
    borrower_id = _resolve_borrower_id(doc)
    doc["borrower_id"] = borrower_id
    doc["borrowerId"] = borrower_id
    doc["borrowDate"] = doc.get("borrowDate") or doc.get("created_at")
    doc["requestDate"] = doc.get("requestDate") or doc.get("borrowDate") or doc.get("created_at")
    doc["returnDate"] = doc.get("returnDate")
    doc["due_date"] = doc.get("due_date")
    doc["is_overdue"] = False
    if doc.get("status") == "active" and doc.get("due_date"):
        doc["is_overdue"] = doc.get("due_date") < datetime.utcnow()
    return doc


def _get_borrower_display_name(user_doc: dict) -> str:
    return (
        user_doc.get("full_name")
        or user_doc.get("fullName")
        or user_doc.get("username")
        or "Unknown"
    )


def enrich_borrows_with_borrowers(borrows: list) -> list[dict]:
    """Attach borrower name and trust score for admin borrow lists."""
    borrower_ids = {
        borrower_id
        for doc in borrows
        if (borrower_id := _resolve_borrower_id(doc))
    }

    users_collection = database.get_collection("users")
    valid_object_ids = [ObjectId(bid) for bid in borrower_ids if ObjectId.is_valid(bid)]
    users_by_id: dict[str, dict] = {}
    if valid_object_ids:
        for user_doc in users_collection.find({"_id": {"$in": valid_object_ids}}):
            users_by_id[str(user_doc["_id"])] = user_doc

    user_cache: dict[str, dict] = {}
    for borrower_id in borrower_ids:
        user_doc = users_by_id.get(borrower_id)
        if not user_doc:
            continue
        points = get_points_for_user(borrower_id)
        user_cache[borrower_id] = {
            "borrowerName": _get_borrower_display_name(user_doc),
            "borrowerUsername": user_doc.get("username"),
            "borrowerTrustScore": points.get("trust_score", 0),
            "borrowerWarningCount": points.get("warning_count", 0),
        }

    enriched = []
    for doc in borrows:
        serialized = serialize_borrow(doc)
        borrower_id = _resolve_borrower_id(doc) or ""
        if borrower_id in user_cache:
            serialized.update(user_cache[borrower_id])
        else:
            serialized["borrowerName"] = borrower_id or "Unknown"
            serialized["borrowerTrustScore"] = 0
            serialized["borrowerWarningCount"] = 0
        enriched.append(serialized)
    return enriched


def get_borrow_query(current_user: dict):
    if current_user.get("role") == "admin":
        return {}
    return {"borrower_id": current_user.get("user_id")}


def _submit_borrow_blockchain_event(
    borrow_id: str,
    action: str,
    current_user: dict,
    asset_id: str | None = None,
):
    """Submit an on-chain transaction when blockchain is configured; otherwise skip."""
    private_key = os.getenv("DEPLOYER_PRIVATE_KEY")
    if not private_key:
        return None

    try:
        borrows_collection = database.get_collection("borrows")
        borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        borrower_id = str(borrow.get("borrower_id")) if borrow else current_user.get("user_id")

        w3 = blockchain_config.get_web3_instance()
        account = w3.eth.account.from_key(private_key)
        sender = account.address
        # Use a self-transfer so the transaction is valid on Ganache and still
        # produces a real on-chain hash that can be shown to the user.
        to_address = sender

        tx_result = blockchain_service.send_transaction_and_wait(
            sender,
            to_address,
            0,
            private_key,
        )
        tx_hash = tx_result["tx_hash"]
        tx_status = tx_result["status"]
        tx_receipt = tx_result["receipt"]

        now = datetime.utcnow()
        transactions_collection = database.get_collection("transactions")
        tx_record = {
            "user_id": borrower_id,
            "borrow_id": borrow_id,
            "asset_id": asset_id,
            "tx_hash": tx_hash,
            "tx_type": action,
            "from_address": sender,
            "to_address": to_address,
            "amount": 0,
            "status": tx_status,
            "network": blockchain_config.rpc_url,
            "receipt": tx_receipt,
            "created_at": now,
            "updated_at": now,
        }
        transactions_collection.insert_one(tx_record)

        borrows_collection = database.get_collection("borrows")
        borrows_collection.update_one(
            {"_id": ObjectId(borrow_id)},
            {
                "$set": {
                    "blockchain_tx_hash": tx_hash,
                    "blockchain_status": tx_status,
                    "updated_at": now,
                }
            },
        )
        return tx_hash
    except Exception as exc:
        print(f"Blockchain transaction skipped for {action}: {exc}")
        return None


def _reserve_asset_quantity(asset_id: str) -> None:
    """Decrement asset quantity when a borrow is approved."""
    if not ObjectId.is_valid(asset_id):
        raise HTTPException(status_code=400, detail="Invalid asset ID")

    assets_collection = database.get_collection("assets")
    asset = assets_collection.find_one({"_id": ObjectId(asset_id)})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if not is_asset_available(asset):
        raise HTTPException(status_code=400, detail="Asset is not available")

    current_quantity, _ = get_stock_state(asset)
    new_quantity = current_quantity - 1

    # Legacy assets may not have quantity/in_stock in MongoDB yet.
    filter_query = {"_id": ObjectId(asset_id)}
    if "quantity" in asset:
        filter_query["quantity"] = current_quantity
    else:
        filter_query["quantity"] = {"$exists": False}

    result = assets_collection.update_one(
        filter_query,
        {
            "$set": {
                "quantity": new_quantity,
                "in_stock": new_quantity > 0,
                "updated_at": datetime.utcnow(),
            }
        },
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Asset is not available")


def _restore_asset_quantity(asset_id: str) -> None:
    """Increment asset quantity when a borrowed asset is returned."""
    if not ObjectId.is_valid(asset_id):
        return

    assets_collection = database.get_collection("assets")
    asset = assets_collection.find_one({"_id": ObjectId(asset_id)})
    if not asset:
        return

    current_quantity, _ = get_stock_state(asset)
    new_quantity = current_quantity + 1
    assets_collection.update_one(
        {"_id": ObjectId(asset_id)},
        {
            "$set": {
                "quantity": new_quantity,
                "in_stock": True,
                "updated_at": datetime.utcnow(),
            }
        },
    )


def _get_borrow_quantity(borrow: dict) -> int:
    try:
        qty = int(borrow.get("quantity", 1) or 1)
    except (TypeError, ValueError):
        qty = 1
    return max(1, qty)


def _adjust_asset_quantity(asset_id: str, delta: int) -> int:
    """Atomically adjust asset quantity. Returns the new quantity."""
    if not ObjectId.is_valid(asset_id):
        raise HTTPException(status_code=400, detail="Invalid asset ID")

    assets_collection = database.get_collection("assets")
    now = datetime.utcnow()

    if delta < 0:
        required = abs(delta)
        filter_query = {"_id": ObjectId(asset_id), "quantity": {"$gte": required}}
    else:
        filter_query = {"_id": ObjectId(asset_id)}

    result = assets_collection.find_one_and_update(
        filter_query,
        {
            "$inc": {"quantity": delta},
            "$set": {"updated_at": now},
        },
        return_document=True,
    )

    if not result:
        if delta < 0:
            raise HTTPException(
                status_code=400,
                detail="Insufficient quantity available for this borrow",
            )
        raise HTTPException(status_code=404, detail="Asset not found")

    new_qty = int(result.get("quantity", 0) or 0)
    assets_collection.update_one(
        {"_id": ObjectId(asset_id)},
        {"$set": {"in_stock": new_qty > 0}},
    )
    return new_qty


@router.get("")
async def get_borrows(
    current_user: dict = Depends(get_current_user)
):
    """Get borrowing records for the current user or all records for admins."""
    try:
        if current_user.get("role") != "admin":
            sync_user_notifications(current_user.get("user_id"))

        borrows_collection = database.get_collection("borrows")
        query = get_borrow_query(current_user)
        borrows = list(
            borrows_collection.find(query).sort("created_at", -1)
        )
        if current_user.get("role") == "admin":
            return enrich_borrows_with_borrowers(borrows)
        return [serialize_borrow(b) for b in borrows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_borrow_history(
    current_user: dict = Depends(get_current_user)
):
    """Return the borrow history for the authenticated user."""
    try:
        user_id = current_user.get("user_id")
        sync_user_notifications(user_id)

        borrows_collection = database.get_collection("borrows")
        query = {"borrower_id": user_id}
        borrows = list(
            borrows_collection.find(query).sort("created_at", -1)
        )
        return [serialize_borrow(b) for b in borrows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_borrow(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a borrow request using the frontend payload shape."""
    try:
        payload = await request.json()
        if not payload:
            raise HTTPException(status_code=400, detail="Request body is required")

        asset_id = payload.get("asset_id") or payload.get("assetId")
        duration_days = payload.get("duration_days")
        if duration_days is None:
            duration_days = payload.get("duration")
        reason = payload.get("reason") or payload.get("notes")
        borrow_qty_raw = (
            payload.get("quantity")
            if payload.get("quantity") is not None
            else payload.get("borrow_quantity", payload.get("qty", 1))
        )

        if not asset_id:
            raise HTTPException(status_code=400, detail="Asset ID is required")
        try:
            duration_days = int(duration_days)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Duration must be a valid number")
        if duration_days < 1:
            raise HTTPException(status_code=400, detail="Duration must be at least 1 day")

        try:
            borrow_qty = int(borrow_qty_raw)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Quantity must be a valid number")
        if borrow_qty < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")

        if not ObjectId.is_valid(asset_id):
            raise HTTPException(status_code=400, detail="Invalid asset ID")

        assets_collection = database.get_collection("assets")
        asset = assets_collection.find_one({"_id": ObjectId(asset_id)})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        if not is_asset_available(asset):
            raise HTTPException(status_code=400, detail="Asset is not available")

        try:
            available_qty = int(asset.get("quantity", 0) or 0)
        except (TypeError, ValueError):
            available_qty = 0

        if borrow_qty > available_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Only {available_qty} item(s) available. You requested {borrow_qty}.",
            )

        # Reserve inventory immediately when the borrow request is created
        _adjust_asset_quantity(asset_id, -borrow_qty)

        now = datetime.utcnow()
        borrow_doc = {
            "borrower_id": current_user.get("user_id"),
            "asset_id": asset_id,
            "assetName": asset.get("name", "Unknown Asset"),
            "reason": reason or "",
            "duration_days": duration_days,
            "quantity": borrow_qty,
            "status": "pending",
            "borrowDate": now,
            "requestDate": now,
            "returnDate": None,
            "trustPoints": 0,
            "quantity_adjusted": True,
            "created_at": now,
            "updated_at": now,
        }

        borrows_collection = database.get_collection("borrows")
        try:
            result = borrows_collection.insert_one(borrow_doc)
        except Exception:
            _adjust_asset_quantity(asset_id, borrow_qty)
            raise
        borrow_doc["_id"] = result.inserted_id
        borrow_id = str(result.inserted_id)

        create_notification(
            current_user.get("user_id"),
            "borrow_request",
            "Borrow Request Submitted",
            f"Your request to borrow '{asset.get('name', 'an asset')}' for {duration_days} day(s) was submitted and is pending approval.",
            {"borrow_id": borrow_id, "asset_id": asset_id, "asset_name": asset.get("name")},
        )

        return {
            "success": True,
            "message": "Borrow request created successfully",
            "data": serialize_borrow(borrow_doc),
            "asset_quantity_remaining": available_qty - borrow_qty,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{borrow_id}/approve")
async def approve_borrow(
    borrow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Approve a borrow request (admin only)."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can approve borrow requests")
        if not ObjectId.is_valid(borrow_id):
            raise HTTPException(status_code=400, detail="Invalid borrow ID")

        borrows_collection = database.get_collection("borrows")
        borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        if borrow.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Only pending requests can be approved")

        asset_id = str(borrow.get("asset_id"))
        borrow_qty = _get_borrow_quantity(borrow)
        qty_adjusted_on_approve = False

        # Legacy borrows created before inventory reservation: decrement on approve
        if not borrow.get("quantity_adjusted"):
            _reserve_asset_quantity(asset_id)
            qty_adjusted_on_approve = True

        tx_hash = _submit_borrow_blockchain_event(
            borrow_id,
            "borrow_approve",
            current_user,
            asset_id=asset_id,
        )

        now = datetime.utcnow()
        duration_days = borrow.get("duration_days") or 7
        due_date = now + timedelta(days=duration_days)

        update_fields = {
            "status": "active",
            "due_date": due_date,
            "quantity_adjusted": True,
            "updated_at": now,
        }
        if tx_hash:
            update_fields["blockchain_tx_hash"] = tx_hash
            update_fields["blockchain_status"] = "pending"

        result = borrows_collection.find_one_and_update(
            {"_id": ObjectId(borrow_id), "status": "pending"},
            {"$set": update_fields},
            return_document=True,
        )
        if not result:
            if qty_adjusted_on_approve:
                _adjust_asset_quantity(asset_id, borrow_qty)
            raise HTTPException(status_code=404, detail="Borrow record not found or already processed")

        record_borrow_approved(str(borrow.get("borrower_id")))

        asset_name = borrow.get("assetName") or "asset"
        create_notification(
            str(borrow.get("borrower_id")),
            "borrow_approved",
            "Borrow Request Approved",
            f"Your request to borrow '{asset_name}' was approved. Due date: {due_date.strftime('%Y-%m-%d')}.",
            {"borrow_id": borrow_id, "asset_name": asset_name, "due_date": due_date.isoformat()},
        )

        message = "Borrow request approved"
        if tx_hash:
            message = "Borrow request approved and blockchain transaction recorded"

        return {
            "success": True,
            "message": message,
            "data": serialize_borrow(result),
            "blockchain_tx_hash": tx_hash,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{borrow_id}/decline")
async def decline_borrow(
    borrow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Decline a borrow request (admin only)."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can decline borrow requests")
        if not ObjectId.is_valid(borrow_id):
            raise HTTPException(status_code=400, detail="Invalid borrow ID")

        borrows_collection = database.get_collection("borrows")
        borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        previous_status = borrow.get("status")
        if previous_status not in ("pending", "approved", "active"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot decline a borrow with status '{previous_status}'",
            )

        result = borrows_collection.find_one_and_update(
            {"_id": ObjectId(borrow_id), "status": previous_status},
            {"$set": {"status": "declined", "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        asset_name = result.get("assetName") or "asset"
        create_notification(
            str(result.get("borrower_id")),
            "borrow_declined",
            "Borrow Request Declined",
            f"Your request to borrow '{asset_name}' was declined by an admin.",
            {"borrow_id": borrow_id, "asset_name": asset_name},
        )

        # Restore inventory if stock was previously reserved
        if result.get("quantity_adjusted") and previous_status in ("pending", "approved", "active"):
            _adjust_asset_quantity(str(result.get("asset_id")), _get_borrow_quantity(result))

        return {
            "success": True,
            "message": "Borrow request declined",
            "data": serialize_borrow(result),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{borrow_id}/return")
async def return_asset(
    borrow_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """User submits a return request; admin confirms condition separately."""
    try:
        payload = await request.json() or {}
        notes = payload.get("notes", "")

        if not ObjectId.is_valid(borrow_id):
            raise HTTPException(status_code=400, detail="Invalid borrow ID")

        borrows_collection = database.get_collection("borrows")
        borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        if borrow.get("borrower_id") != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="You can only return your own borrow records")

        if borrow.get("status") != "active":
            raise HTTPException(status_code=400, detail="Only active borrows can be returned")

        now = datetime.utcnow()
        borrows_collection.update_one(
            {"_id": ObjectId(borrow_id)},
            {
                "$set": {
                    "status": "return_pending",
                    "return_notes": notes,
                    "return_submitted_at": now,
                    "updated_at": now,
                }
            },
        )

        updated_borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        asset_name = borrow.get("assetName") or "asset"
        create_notification(
            current_user.get("user_id"),
            "return_submitted",
            "Return Submitted",
            f"You submitted a return for '{asset_name}'. An admin will inspect and confirm it.",
            {"borrow_id": borrow_id, "asset_name": asset_name},
        )

        return {
            "success": True,
            "message": "Return submitted. An admin will inspect the asset and confirm your return.",
            "data": serialize_borrow(updated_borrow),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{borrow_id}/confirm-return")
async def confirm_return(
    borrow_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Admin confirms a return and sets the asset condition."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can confirm returns")

        payload = await request.json() or {}
        condition = (payload.get("condition") or "").lower()
        admin_notes = payload.get("notes", "")

        if condition not in ("good", "fair", "poor", "damaged"):
            raise HTTPException(status_code=400, detail="A valid condition is required (good, fair, poor, damaged)")

        if not ObjectId.is_valid(borrow_id):
            raise HTTPException(status_code=400, detail="Invalid borrow ID")

        borrows_collection = database.get_collection("borrows")
        borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        if borrow.get("status") != "return_pending":
            raise HTTPException(status_code=400, detail="Only pending returns can be confirmed")

        borrow_qty = _get_borrow_quantity(borrow)
        asset_id = str(borrow.get("asset_id"))

        tx_hash = _submit_borrow_blockchain_event(
            borrow_id,
            "borrow_return",
            current_user,
            asset_id=asset_id,
        )

        _restore_asset_quantity(asset_id)

        now = datetime.utcnow()
        return_submitted_at = borrow.get("return_submitted_at") or now
        due_date = borrow.get("due_date")
        is_late = bool(due_date and return_submitted_at > due_date)
        days_late = max((return_submitted_at - due_date).days, 1) if is_late and due_date else 0
        trust_points = record_return(
            str(borrow.get("borrower_id")),
            condition,
            is_late,
            days_late,
        )

        asset_name = borrow.get("assetName") or "asset"

        update_data = {
            "status": "completed",
            "returnDate": now,
            "condition": condition,
            "admin_return_notes": admin_notes,
            "updated_at": now,
            "trustPoints": trust_points,
            "returned_on_time": not is_late,
            "confirmed_by_admin_id": current_user.get("user_id"),
            "return_confirmed_at": now,
        }
        if tx_hash:
            update_data["blockchain_tx_hash"] = tx_hash
            update_data["blockchain_status"] = "pending"

        borrows_collection.update_one(
            {"_id": ObjectId(borrow_id)},
            {"$set": update_data},
        )

        updated_borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})

        on_time_text = "on time" if not is_late else f"late ({days_late} day(s))"
        trust_message = f"Trust points: {trust_points:+d}."
        create_notification(
            str(borrow.get("borrower_id")),
            "return_confirmed",
            "Return Confirmed",
            f"Your return of '{asset_name}' was confirmed ({on_time_text}). Condition: {condition}. {trust_message}",
            {
                "borrow_id": borrow_id,
                "asset_name": asset_name,
                "condition": condition,
                "is_late": is_late,
                "trust_points": trust_points,
            },
        )

        create_notification(
            str(borrow.get("borrower_id")),
            "borrow_history",
            "Borrow History Updated",
            f"'{asset_name}' was added to your borrow history ({on_time_text} return). View your full history under Borrow History.",
            {
                "borrow_id": borrow_id,
                "asset_name": asset_name,
                "status": "completed",
                "is_late": is_late,
            },
        )

        message = "Return confirmed successfully"
        if tx_hash:
            message = "Return confirmed and blockchain transaction recorded"

        return {
            "success": True,
            "message": message,
            "data": serialize_borrow(updated_borrow),
            "blockchain_tx_hash": tx_hash,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
