from fastapi import APIRouter, Depends, HTTPException
from bson.objectid import ObjectId
from config.database import database
from middleware.auth import get_current_user
from routes.borrow import process_overdue_borrows

router = APIRouter(prefix="/api/penalties", tags=["penalties"])


def serialize_penalty(doc):
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("")
async def get_penalties(current_user: dict = Depends(get_current_user)):
    """Get late-return warnings / penalties for the current user."""
    try:
        process_overdue_borrows()
        penalties_collection = database.get_collection("penalties")
        user_id = current_user.get("user_id")

        penalties = list(
            penalties_collection.find({"user_id": user_id}).sort("created_at", -1)
        )

        users_collection = database.get_collection("users")
        user_doc = None
        if ObjectId.is_valid(str(user_id)):
            user_doc = users_collection.find_one({"_id": ObjectId(str(user_id))})

        warning_count = user_doc.get("late_return_warnings", 0) if user_doc else 0

        return {
            "success": True,
            "late_return_warnings": warning_count,
            "warnings_remaining": max(0, 3 - warning_count),
            "account_disabled": user_doc.get("is_active") is False if user_doc else False,
            "penalties": [serialize_penalty(p) for p in penalties],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
