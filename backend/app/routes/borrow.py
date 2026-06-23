import os
from fastapi import APIRouter, Depends, HTTPException, Request
from bson.objectid import ObjectId
from datetime import datetime
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
    return doc


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
    """Submit a real on-chain transaction for borrow lifecycle actions and store the hash."""
    private_key = os.getenv("DEPLOYER_PRIVATE_KEY")
    if not private_key:
        raise HTTPException(status_code=500, detail="Blockchain private key is not configured")

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
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit blockchain transaction: {str(exc)}",
        ) from exc


@router.get("")
async def get_borrows(
    current_user: dict = Depends(get_current_user)
):
    """Get borrowing records for the current user or all records for admins."""
    try:
        borrows_collection = database.get_collection("borrows")
        query = get_borrow_query(current_user)
        borrows = list(
            borrows_collection.find(query).sort("created_at", -1)
        )
        return [serialize_borrow(b) for b in borrows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_borrow_history(
    current_user: dict = Depends(get_current_user)
):
    """Return the borrow history for the authenticated user."""
    try:
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

        if not asset_id:
            raise HTTPException(status_code=400, detail="Asset ID is required")
        try:
            duration_days = int(duration_days)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Duration must be a valid number")
        if duration_days < 1:
            raise HTTPException(status_code=400, detail="Duration must be at least 1 day")

        if not ObjectId.is_valid(asset_id):
            raise HTTPException(status_code=400, detail="Invalid asset ID")

        assets_collection = database.get_collection("assets")
        asset = assets_collection.find_one({"_id": ObjectId(asset_id)})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        try:
            quantity = int(asset.get("quantity", 0) or 0)
        except (TypeError, ValueError):
            quantity = 0

        is_available = quantity > 0 and (asset.get("in_stock", True) or quantity > 0)
        if not is_available:
            raise HTTPException(status_code=400, detail="Asset is not available")

        now = datetime.utcnow()
        borrow_doc = {
            "borrower_id": current_user.get("user_id"),
            "asset_id": asset_id,
            "assetName": asset.get("name", "Unknown Asset"),
            "reason": reason or "",
            "duration_days": duration_days,
            "status": "pending",
            "borrowDate": now,
            "requestDate": now,
            "returnDate": None,
            "trustPoints": 0,
            "created_at": now,
            "updated_at": now,
        }

        borrows_collection = database.get_collection("borrows")
        result = borrows_collection.insert_one(borrow_doc)
        borrow_doc["_id"] = result.inserted_id
        return {
            "success": True,
            "message": "Borrow request created successfully",
            "data": serialize_borrow(borrow_doc)
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

        tx_hash = _submit_borrow_blockchain_event(
            borrow_id,
            "borrow_approve",
            current_user,
            asset_id=str(borrow.get("asset_id")),
        )

        now = datetime.utcnow()
        result = borrows_collection.find_one_and_update(
            {"_id": ObjectId(borrow_id)},
            {
                "$set": {
                    "status": "active",
                    "blockchain_tx_hash": tx_hash,
                    "blockchain_status": "pending",
                    "updated_at": now,
                }
            },
            return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Borrow record not found")

        return {
            "success": True,
            "message": "Borrow request approved and blockchain transaction recorded",
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
        result = borrows_collection.find_one_and_update(
            {"_id": ObjectId(borrow_id)},
            {"$set": {"status": "declined", "updated_at": datetime.utcnow()}},
            return_document=True,
        )
        if not result:
            raise HTTPException(status_code=404, detail="Borrow record not found")

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

        tx_hash = _submit_borrow_blockchain_event(
            borrow_id,
            "borrow_return",
            current_user,
            asset_id=str(borrow.get("asset_id")),
        )

        now = datetime.utcnow()
        update_data = {
            "status": "completed",
            "returnDate": now,
            "condition": condition,
            "notes": notes,
            "updated_at": now,
            "trustPoints": borrow.get("trustPoints", 0) or 0,
            "blockchain_tx_hash": tx_hash,
            "blockchain_status": "pending",
        }
        borrows_collection.update_one(
            {"_id": ObjectId(borrow_id)},
            {"$set": update_data}
        )

        updated_borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        return {
            "success": True,
            "message": "Asset return submitted successfully and blockchain transaction recorded",
            "data": serialize_borrow(updated_borrow),
            "blockchain_tx_hash": tx_hash,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

