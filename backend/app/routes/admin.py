from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from config.database import database
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get admin dashboard statistics (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can access this endpoint")
        
        # Get collections
        assets_collection = database.get_collection("assets")
        borrows_collection = database.get_collection("borrows")
        users_collection = database.get_collection("users")
        
        # Count total assets
        total_assets = assets_collection.count_documents({})
        
        # Count available assets
        available_assets = assets_collection.count_documents({"availability": True})
        
        # Count total borrow requests
        total_borrows = borrows_collection.count_documents({})
        
        # Count pending requests (status = pending)
        pending_requests = borrows_collection.count_documents({"status": "pending"})
        
        # Count active loans (status = active or approved)
        active_loans = borrows_collection.count_documents({"status": {"$in": ["active", "approved"]}})
        
        # Count returned items (status = returned)
        returned_items = borrows_collection.count_documents({"status": "returned"})
        
        # Count total users
        total_users = users_collection.count_documents({})
        
        # Count admin users
        admin_users = users_collection.count_documents({"role": "admin"})
        
        # Count regular users
        regular_users = users_collection.count_documents({"role": "user"})
        
        return {
            "success": True,
            "data": {
                "assets": {
                    "total": total_assets,
                    "available": available_assets,
                    "unavailable": total_assets - available_assets
                },
                "borrows": {
                    "total": total_borrows,
                    "pending": pending_requests,
                    "active": active_loans,
                    "returned": returned_items
                },
                "users": {
                    "total": total_users,
                    "admins": admin_users,
                    "regular": regular_users
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
