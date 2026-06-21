from fastapi import APIRouter, HTTPException, Header
from bson.objectid import ObjectId
import jwt
from config.settings import settings
from config.database import database

router = APIRouter()

@router.get("/profile")
async def get_profile(authorization: str = Header(None)):
    """Get current user's profile"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing authorization header")
        
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("user_id")
        
        users = database.get_collection('users')
        user_doc = users.find_one({"_id": ObjectId(user_id)})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "id": str(user_doc["_id"]),
            "username": user_doc["username"],
            "email": user_doc["email"],
            "full_name": user_doc.get("full_name"),
            "role": user_doc.get("role", "user"),
            "kyc_verified": user_doc.get("kyc_verified", False),
            "credit_score": user_doc.get("credit_score", 0.0),
            "wallet_address": user_doc.get("wallet_address")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

@router.get("")
async def get_all_users():
    """Get all users (paginated)"""
    try:
        users = database.get_collection('users')
        user_list = list(users.find().limit(50))
        
        return {
            "users": [
                {
                    "id": str(u["_id"]),
                    "username": u["username"],
                    "email": u["email"],
                    "role": u.get("role", "user"),
                    "kyc_verified": u.get("kyc_verified", False)
                }
                for u in user_list
            ],
            "total": users.count_documents({})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get users: {str(e)}")
