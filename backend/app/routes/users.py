from datetime import datetime

import cloudinary.uploader
from bson.objectid import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from config.cloudinary import init_cloudinary
from config.database import database
from middleware.auth import get_current_user
from services.points_service import ensure_points_document, get_points_for_user, reset_warnings_for_user
from services.user_service import delete_user_completely
from services.penalty_service import get_penalties_for_user
from services.notification_service import create_notification, sync_user_notifications
from utils.hash_utils import hash_password, verify_password

router = APIRouter(tags=["users"])


def serialize_user(user_doc, points: dict | None = None):
    if not user_doc:
        return None

    points = points or get_points_for_user(str(user_doc.get("_id")))
    trust_score = points.get("trust_score", 0)
    warning_count = points.get("warning_count", 0)
    is_active = user_doc.get("is_active", True)
    banned = is_active is False and warning_count >= 3

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
        "profile_image": user_doc.get("profile_image"),
        "trust_score": trust_score,
        "credit_score": trust_score,
        "borrow_count": points.get("borrow_count", 0),
        "on_time_returns": points.get("on_time_returns", 0),
        "late_returns": points.get("late_returns", 0),
        "warning_count": warning_count,
        "max_warnings": 3,
        "has_warnings": warning_count > 0,
        "low_trust_score": trust_score < 0,
        "is_banned": banned,
        "wallet_address": user_doc.get("wallet_address"),
        "is_active": is_active,
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

        ensure_points_document(current_user.get("user_id"))
        if user_doc.get("role") != "admin":
            sync_user_notifications(current_user.get("user_id"))

        user_doc = users.find_one({"_id": ObjectId(current_user.get("user_id"))})
        profile = serialize_user(user_doc)
        if user_doc.get("role") != "admin":
            profile["penalties"] = get_penalties_for_user(current_user.get("user_id"))
        return profile
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

        create_notification(
            current_user.get("user_id"),
            "account_update",
            "Profile Updated",
            "Your profile information was updated successfully.",
            {"fields": [k for k in update_data.keys() if k != "updated_at"]},
        )

        return serialize_user(updated_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.post("/profile/avatar")
async def upload_profile_avatar(
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload or replace the current user's profile picture."""
    try:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")

        init_cloudinary()
        file_content = await image.read()
        result = cloudinary.uploader.upload(
            file_content,
            folder="blocklend/profiles",
            resource_type="image",
        )
        image_url = result.get("secure_url")
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload profile image")

        users = database.get_collection("users")
        users.update_one(
            {"_id": ObjectId(current_user.get("user_id"))},
            {"$set": {"profile_image": image_url, "updated_at": datetime.utcnow()}},
        )
        updated_user = users.find_one({"_id": ObjectId(current_user.get("user_id"))})

        create_notification(
            current_user.get("user_id"),
            "account_update",
            "Profile Photo Updated",
            "Your profile photo was changed successfully.",
        )

        return serialize_user(updated_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload profile image: {str(e)}")


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

        create_notification(
            current_user.get("user_id"),
            "account_update",
            "Password Changed",
            "Your account password was changed successfully.",
        )

        return {"success": True, "message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")


@router.delete("/profile")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete the current user's account and all related data."""
    try:
        user_id = current_user.get("user_id")
        if not delete_user_completely(user_id):
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


@router.get("/{user_id}")
async def get_user_by_id(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single user's details (admin only)."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can access user details")
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")

        users = database.get_collection("users")
        user_doc = users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        return {"user": serialize_user(user_doc)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")


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


@router.put("/{user_id}/reset-warnings")
async def reset_user_warnings(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reset a user's warning count to zero (admin only)."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can manage users")
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")

        users = database.get_collection("users")
        user_doc = users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        if user_doc.get("role") == "admin":
            raise HTTPException(status_code=400, detail="Cannot reset warnings for admin accounts")

        reset_warnings_for_user(user_id)
        create_notification(
            user_id,
            "account_update",
            "Warnings Reset",
            "An administrator has reset your warning count to 0. Please maintain good borrowing habits going forward.",
        )
        updated_user = users.find_one({"_id": ObjectId(user_id)})

        return {
            "success": True,
            "message": "User warnings reset successfully",
            "data": serialize_user(updated_user),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset warnings: {str(e)}")


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Permanently delete a user account and all related data (admin only)."""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can manage users")
        if not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=400, detail="Invalid user ID")
        if user_id == current_user.get("user_id"):
            raise HTTPException(
                status_code=400,
                detail="You cannot delete your own account here. Use Delete Account on your profile page.",
            )

        users = database.get_collection("users")
        user_doc = users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        if user_doc.get("role") == "admin":
            raise HTTPException(status_code=400, detail="Cannot delete admin accounts")

        if not delete_user_completely(user_id):
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "success": True,
            "message": f"User '{user_doc.get('username', user_id)}' deleted successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")
