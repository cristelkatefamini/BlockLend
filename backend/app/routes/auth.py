from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from email_validator import validate_email, EmailNotValidError
from bson.objectid import ObjectId
from datetime import datetime
import jwt
from config.settings import settings
from config.database import database
from utils.hash_utils import hash_password, verify_password

router = APIRouter()

# Schemas
class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str = None
    role: str = "user"
    kyc_verified: bool = False
    credit_score: float = 0.0
    credit_score: float = 0.0

# Helper function to validate email
def is_valid_email(email: str) -> bool:
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False

# Routes
@router.post("/register")
async def register(user: UserRegister):
    """Register a new user"""
    try:
        # Validate email format
        if not is_valid_email(user.email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        users = database.get_collection('users')
        
        # Check if user exists
        if users.find_one({"email": user.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        if users.find_one({"username": user.username}):
            raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create user
        user_doc = {
            "username": user.username,
            "email": user.email,
            "password_hash": hash_password(user.password),
            "full_name": user.full_name or user.username,
            "role": user.role,
            "kyc_verified": False,
            "credit_score": 0.0,
            "wallet_address": None,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = users.insert_one(user_doc)
        
        # Generate JWT token for auto-login
        payload = {
            "user_id": str(result.inserted_id),
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
        
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        return {
            "message": "Account created successfully",
            "user": {
                "id": str(result.inserted_id),
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name or user.username,
                "role": user.role
            },
            "token": token
        }
    except HTTPException as he:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/login")
async def login(user: UserLogin):
    """Login user"""
    try:
        users = database.get_collection('users')
        user_doc = users.find_one({"email": user.email})
        
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if user_doc.get("is_active") is False:
            raise HTTPException(status_code=403, detail="Your account has been deactivated")
        
        # Verify password - note: check_password_hash takes (stored_hash, provided_password)
        if not verify_password(user_doc.get("password_hash", ""), user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate JWT token
        payload = {
            "user_id": str(user_doc["_id"]),
            "username": user_doc["username"],
            "email": user_doc["email"],
            "role": user_doc.get("role", "user")
        }
        
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        
        return {
            "token": token,
            "user": {
                "id": str(user_doc["_id"]),
                "username": user_doc["username"],
                "email": user_doc["email"],
                "role": user_doc.get("role", "user")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.get("/profile")
async def get_profile(authorization: str = Header(None)):
    """Get user profile"""
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
            "credit_score": user_doc.get("credit_score", 0.0)
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

