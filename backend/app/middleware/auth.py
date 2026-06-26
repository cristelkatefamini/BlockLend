import jwt
from bson.objectid import ObjectId
from fastapi import HTTPException, Depends, Header
from config.database import database
from config.settings import settings
from services.points_service import get_ban_message, get_points_for_user, is_user_banned
from typing import Optional

async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    FastAPI dependency to validate JWT token and return current user ID
    
    Args:
        authorization: Authorization header value (Bearer <token>)
    
    Returns:
        dict with user_id and other token data
    
    Raises:
        HTTPException: If token is missing or invalid
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Token is missing")
    
    try:
        # Extract token from "Bearer <token>" format
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid token format")
        
        token = parts[1]
        
        # Decode JWT token
        data = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=['HS256'])
        user_id = data.get("user_id")
        if not user_id or not ObjectId.is_valid(user_id):
            raise HTTPException(status_code=401, detail="Invalid token")

        user_doc = database.get_collection("users").find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")

        if user_doc.get("is_active") is False:
            if is_user_banned(user_id):
                raise HTTPException(status_code=403, detail=get_ban_message())
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact an administrator.")

        return data
        
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
