from fastapi import APIRouter, Depends, HTTPException
from bson.objectid import ObjectId

from middleware.auth import get_current_user
from services.notification_service import (
    get_notifications_for_user,
    get_unread_count,
    mark_all_as_read,
    mark_as_read,
    sync_user_notifications,
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    """Get the current user's activity notifications."""
    try:
        user_id = current_user.get("user_id")
        if current_user.get("role") != "admin":
            sync_user_notifications(user_id)
        notifications = get_notifications_for_user(user_id)
        unread = get_unread_count(user_id)
        return {
            "notifications": notifications,
            "unread_count": unread,
            "total": len(notifications),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
async def unread_count(current_user: dict = Depends(get_current_user)):
    """Return the number of unread notifications."""
    try:
        user_id = current_user.get("user_id")
        if current_user.get("role") != "admin":
            sync_user_notifications(user_id)
        count = get_unread_count(user_id)
        return {"unread_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/read-all")
async def read_all(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read."""
    try:
        modified = mark_all_as_read(current_user.get("user_id"))
        return {"success": True, "marked_read": modified}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{notification_id}/read")
async def read_one(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    try:
        if not ObjectId.is_valid(notification_id):
            raise HTTPException(status_code=400, detail="Invalid notification ID")
        success = mark_as_read(notification_id, current_user.get("user_id"))
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
