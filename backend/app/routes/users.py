from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from bson.objectid import ObjectId
from config.database import database
from middleware.auth import get_current_user
from utils.hash_utils import hash_password, verify_password

router = APIRouter(tags=["users"])


def serialize_user(user_doc):
    if not user_doc:
        return None

    return {
        "id": str(user_doc.get("_id")),
        "username": user_doc.get("username"),
        "email": user_doc.get("email"),
        "full_name": user_doc.get("full_name") or user_doc.get("fullName"),
        "phone_number": user_doc.get("phone_number") or user_doc.get("phoneNumber"),
        "address": user_doc.get("address"),
        "department": user_doc.get("department"),
        "section": user_doc.get("section"),
        "role": user_doc.get("role", "user"),
        "kyc_verified": user_doc.get("kyc_verified", False),
        "credit_score": user_doc.get("credit_score", 0.0),
        "wallet_address": user_doc.get("wallet_address"),
        "is_active": user_doc.get("is_active", True),
        "late_return_warnings": user_doc.get("late_return_warnings", 0),
        "created_at": user_doc.get("created_at"),
        "updated_at": user_doc.get("updated_at"),
    }


@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get the current user's profile."""
    try:
        users = database.get_collection("users")
        user_doc = users.find_one({"_id": ObjectId(current_user.get("user_id"))})

        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        return serialize_user(user_doc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")


@router.put("/profile")
async def update_profile(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update the current user's profile data."""
    try:
        payload = await request.json()
        if not payload:
            raise HTTPException(status_code=400, detail="Request body is required")

        field_map = {
            "full_name": ["full_name", "fullName"],
            "phone_number": ["phone_number", "phoneNumber"],
            "address": ["address"],
            "department": ["department"],
            "section": ["section"],
        }

        update_data = {}
        for db_key, aliases in field_map.items():
            for alias in aliases:
                if alias in payload and payload.get(alias) is not None:
                    value = payload.get(alias)
                    if isinstance(value, str):
                        value = value.strip()
                    update_data[db_key] = value
                    break

        if not update_data:
            raise HTTPException(status_code=400, detail="No valid profile fields provided")

        update_data["updated_at"] = datetime.utcnow()
        users = database.get_collection("users")
        users.update_one(
            {"_id": ObjectId(current_user.get("user_id"))},
            {"$set": update_data}
        )
        updated_user = users.find_one({"_id": ObjectId(current_user.get("user_id"))})

        return serialize_user(updated_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.put("/change-password")
async def change_password(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Change the current user's password."""
    try:
        payload = await request.json()
        current_password = payload.get("current_password")
        new_password = payload.get("new_password")

        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Current and new password are required")

        users = database.get_collection("users")
        user_doc = users.find_one({"_id": ObjectId(current_user.get("user_id"))})

        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(user_doc.get("password_hash", ""), current_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        users.update_one(
            {"_id": ObjectId(current_user.get("user_id"))},
            {
                "$set": {
                    "password_hash": hash_password(new_password),
                    "updated_at": datetime.utcnow(),
                }
            }
        )

        return {"success": True, "message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")


@router.delete("/profile")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete the current user's account."""
    try:
        users = database.get_collection("users")
        result = users.delete_one({"_id": ObjectId(current_user.get("user_id"))})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"success": True, "message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")


@router.get("")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    """Get all users for admins."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can access user management")

        users = database.get_collection("users")
        user_list = list(users.find().sort("created_at", -1))

        return {
            "users": [serialize_user(u) for u in user_list],
            "total": len(user_list),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")


@router.put("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Activate or deactivate a user account (admin only)."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can manage users")
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")

        users = database.get_collection("users")
        user_doc = users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        new_status = not bool(user_doc.get("is_active", True))
        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_active": new_status, "updated_at": datetime.utcnow()}}
        )
        updated_user = users.find_one({"_id": ObjectId(user_id)})

        return {
            "success": True,
            "message": "User status updated successfully",
            "data": serialize_user(updated_user),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user status: {str(e)}")

