import os
from fastapi import APIRouter, Depends, HTTPException, Request
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from config.blockchain import blockchain_config
from config.database import database
from middleware.auth import get_current_user
from services.blockchain_service import blockchain_service

router = APIRouter(prefix="/api/borrow", tags=["borrow"])


def serialize_borrow(doc):
    doc = dict(doc)
    doc["_id"] = str(doc.get("_id"))
    doc["id"] = str(doc.get("_id"))
    doc["assetId"] = doc.get("asset_id")
    doc["assetName"] = doc.get("assetName") or doc.get("asset_name") or "Unknown Asset"
    doc["borrowerId"] = doc.get("borrower_id")
    doc["borrowDate"] = doc.get("borrowDate") or doc.get("created_at")
    doc["requestDate"] = doc.get("requestDate") or doc.get("borrowDate") or doc.get("created_at")
    doc["returnDate"] = doc.get("returnDate")
    doc["due_date"] = doc.get("due_date")
    try:
        doc["quantity"] = max(1, int(doc.get("quantity", 1) or 1))
    except (TypeError, ValueError):
        doc["quantity"] = 1
    return doc


def _enrich_borrow(doc: dict) -> dict:
    """Attach borrower display name for admin views."""
    borrower_id = doc.get("borrower_id")
    if borrower_id and ObjectId.is_valid(str(borrower_id)):
        users_collection = database.get_collection("users")
        user = users_collection.find_one({"_id": ObjectId(str(borrower_id))})
        if user:
            doc["borrowerName"] = user.get("username") or user.get("full_name") or "Unknown"
    return doc


def _get_borrow_due_date(borrow: dict):
    """Resolve due date from stored value or borrow start + duration."""
    due = borrow.get("due_date")
    if due:
        return due
    start = borrow.get("borrowDate") or borrow.get("created_at")
    if not start:
        return None
    try:
        days = int(borrow.get("duration_days", 7) or 7)
    except (TypeError, ValueError):
        days = 7
    return start + timedelta(days=days)


def process_overdue_borrows():
    """
    Issue one late-return warning per overdue borrow per calendar day.
    After 3 total warnings for a user, disable their account automatically.
    """
    borrows_collection = database.get_collection("borrows")
    users_collection = database.get_collection("users")
    penalties_collection = database.get_collection("penalties")

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    active_borrows = borrows_collection.find({
        "status": {"$in": ["active", "approved"]},
    })

    for borrow in active_borrows:
        due_date = _get_borrow_due_date(borrow)
        if not due_date or due_date >= now:
            continue

        borrow_id = str(borrow["_id"])
        borrower_id = borrow.get("borrower_id")
        if not borrower_id or not ObjectId.is_valid(str(borrower_id)):
            continue

        already_warned_today = penalties_collection.find_one({
            "borrow_id": borrow_id,
            "penalty_type": "late_return_warning",
            "created_at": {"$gte": today_start},
        })
        if already_warned_today:
            continue

        penalties_collection.insert_one({
            "user_id": str(borrower_id),
            "borrow_id": borrow_id,
            "asset_id": borrow.get("asset_id"),
            "asset_name": borrow.get("assetName", "Unknown Asset"),
            "penalty_type": "late_return_warning",
            "message": (
                f"Late return warning: '{borrow.get('assetName', 'asset')}' "
                f"was due on {due_date.strftime('%Y-%m-%d')}."
            ),
            "due_date": due_date,
            "created_at": now,
        })

        warning_count = penalties_collection.count_documents({
            "user_id": str(borrower_id),
            "penalty_type": "late_return_warning",
        })

        update_fields = {
            "late_return_warnings": warning_count,
            "updated_at": now,
        }
        if warning_count >= 3:
            update_fields["is_active"] = False

        users_collection.update_one(
            {"_id": ObjectId(str(borrower_id))},
            {"$set": update_fields},
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
        w3 = blockchain_config.get_web3_instance()
        account = w3.eth.account.from_key(private_key)
        sender = account.address
        # Use a self-transfer so the transaction is valid on Ganache and still
        # produces a real on-chain hash that can be shown to the user.
        to_address = sender

        tx_hash = blockchain_service.send_transaction(
            sender,
            to_address,
            0,
            private_key,
        )

        now = datetime.utcnow()
        transactions_collection = database.get_collection("transactions")
        tx_record = {
            "user_id": current_user.get("user_id"),
            "borrow_id": borrow_id,
            "asset_id": asset_id,
            "tx_hash": tx_hash,
            "tx_type": action,
            "from_address": sender,
            "to_address": to_address,
            "amount": 0,
            "status": "pending",
            "network": blockchain_config.rpc_url,
            "receipt": None,
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
                    "blockchain_status": "pending",
                    "updated_at": now,
                }
            },
        )
        return tx_hash
    except Exception as exc:
        print(f"Blockchain unavailable, skipping on-chain record: {exc}")
        return None


@router.get("")
async def get_borrows(
    current_user: dict = Depends(get_current_user)
):
    """Get borrowing records for the current user or all records for admins."""
    try:
        process_overdue_borrows()
        borrows_collection = database.get_collection("borrows")
        query = get_borrow_query(current_user)
        borrows = list(
            borrows_collection.find(query).sort("created_at", -1)
        )
        serialized = []
        for b in borrows:
            item = serialize_borrow(b)
            if current_user.get("role") == "admin":
                _enrich_borrow(item)
            serialized.append(item)
        return serialized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_borrow_history(
    current_user: dict = Depends(get_current_user)
):
    """Return the borrow history for the authenticated user."""
    try:
        process_overdue_borrows()
        borrows_collection = database.get_collection("borrows")
        query = {"borrower_id": current_user.get("user_id")}
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

        try:
            available_qty = int(asset.get("quantity", 0) or 0)
        except (TypeError, ValueError):
            available_qty = 0

        if borrow_qty > available_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Only {available_qty} item(s) available. You requested {borrow_qty}.",
            )

        is_available = available_qty > 0 and (asset.get("in_stock", True) or available_qty > 0)
        if not is_available:
            raise HTTPException(status_code=400, detail="Asset is not available")

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
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve a borrow with status '{borrow.get('status')}'",
            )

        asset_id = str(borrow.get("asset_id"))
        borrow_qty = _get_borrow_quantity(borrow)
        qty_adjusted_on_approve = False

        # Legacy borrows created before inventory reservation: decrement on approve
        if not borrow.get("quantity_adjusted"):
            _adjust_asset_quantity(asset_id, -borrow_qty)
            qty_adjusted_on_approve = True

        tx_hash = _submit_borrow_blockchain_event(
            borrow_id,
            "borrow_approve",
            current_user,
            asset_id=asset_id,
        )

        now = datetime.utcnow()
        try:
            duration_days = int(borrow.get("duration_days", 7) or 7)
        except (TypeError, ValueError):
            duration_days = 7
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

        return {
            "success": True,
            "message": "Borrow request approved successfully",
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
    """Mark a borrow as returned."""
    try:
        payload = await request.json()
        condition = (payload or {}).get("condition", "good")
        notes = (payload or {}).get("notes", "")

        if not ObjectId.is_valid(borrow_id):
            raise HTTPException(status_code=400, detail="Invalid borrow ID")

        borrows_collection = database.get_collection("borrows")
        borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        if not borrow:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        if borrow.get("borrower_id") != current_user.get("user_id"):
            raise HTTPException(status_code=403, detail="You can only return your own borrow records")

        if borrow.get("status") not in ("active", "approved"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot return a borrow with status '{borrow.get('status')}'",
            )

        borrow_qty = _get_borrow_quantity(borrow)
        asset_id = str(borrow.get("asset_id"))

        tx_hash = _submit_borrow_blockchain_event(
            borrow_id,
            "borrow_return",
            current_user,
            asset_id=asset_id,
        )

        now = datetime.utcnow()
        update_data = {
            "status": "completed",
            "returnDate": now,
            "condition": condition,
            "notes": notes,
            "updated_at": now,
            "trustPoints": borrow.get("trustPoints", 0) or 0,
        }
        if tx_hash:
            update_data["blockchain_tx_hash"] = tx_hash
            update_data["blockchain_status"] = "pending"
        update_result = borrows_collection.update_one(
            {"_id": ObjectId(borrow_id), "status": {"$in": ["active", "approved"]}},
            {"$set": update_data},
        )
        if update_result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Borrow already returned or not eligible for return")

        # Restore inventory when the item is returned (only if stock was reserved)
        new_qty = None
        if borrow.get("quantity_adjusted"):
            new_qty = _adjust_asset_quantity(asset_id, borrow_qty)

        updated_borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        response = {
            "success": True,
            "message": "Asset return submitted successfully and blockchain transaction recorded",
            "data": serialize_borrow(updated_borrow),
            "blockchain_tx_hash": tx_hash,
        }
        if new_qty is not None:
            response["asset_quantity_remaining"] = new_qty
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

