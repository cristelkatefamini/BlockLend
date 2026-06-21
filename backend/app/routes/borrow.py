from fastapi import APIRouter, Depends, HTTPException, Request
from bson.objectid import ObjectId
from datetime import datetime
from config.database import database
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/borrow", tags=["borrow"])


def serialize_borrow(doc):
    doc = dict(doc)
    doc["_id"] = str(doc.get("_id"))
    doc["assetId"] = doc.get("asset_id")
    doc["borrowDate"] = doc.get("borrowDate") or doc.get("created_at")
    doc["returnDate"] = doc.get("returnDate")
    return doc


@router.get("")
async def get_borrows(
    current_user: dict = Depends(get_current_user)
):
    """Get borrowing records for the current user."""
    try:
        borrows_collection = database.get_collection("borrows")
        user_id = current_user.get("user_id")
        borrows = list(
            borrows_collection.find({"borrower_id": user_id}).sort("created_at", -1)
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
        user_id = current_user.get("user_id")
        borrows = list(
            borrows_collection.find({"borrower_id": user_id}).sort("created_at", -1)
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
        if duration_days is None or int(duration_days) < 1:
            raise HTTPException(status_code=400, detail="Duration must be at least 1 day")

        if not ObjectId.is_valid(asset_id):
            raise HTTPException(status_code=400, detail="Invalid asset ID")

        duration_days = int(duration_days)
        assets_collection = database.get_collection("assets")
        asset = assets_collection.find_one({"_id": ObjectId(asset_id)})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")

        if not asset.get("in_stock", True) or asset.get("quantity", 0) <= 0:
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

        update_data = {
            "status": "completed",
            "returnDate": datetime.utcnow(),
            "condition": condition,
            "notes": notes,
            "updated_at": datetime.utcnow(),
            "trustPoints": borrow.get("trustPoints", 0) or 0,
        }
        borrows_collection.update_one(
            {"_id": ObjectId(borrow_id)},
            {"$set": update_data}
        )

        updated_borrow = borrows_collection.find_one({"_id": ObjectId(borrow_id)})
        return {
            "success": True,
            "message": "Asset return submitted successfully",
            "data": serialize_borrow(updated_borrow)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

