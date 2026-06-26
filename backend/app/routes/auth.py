import hashlib
import secrets
from datetime import datetime, timedelta

import jwt
from bson.objectid import ObjectId
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from config.database import database
from config.settings import settings
from services.email_service import send_verification_email
from services.notification_service import create_notification
from services.points_service import ensure_points_document, get_ban_message, is_user_banned
from utils.hash_utils import hash_password, verify_password

router = APIRouter()

VERIFICATION_TOKEN_BYTES = 32


class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    full_name: str = None
    role: str = "user"


class UserLogin(BaseModel):
    email: str
    password: str


class ResendVerificationRequest(BaseModel):
    email: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str = None
    role: str = "user"
    kyc_verified: bool = False
    credit_score: float = 0.0


def is_valid_email(email: str) -> bool:
    try:
        validate_email(email)
        return True
    except EmailNotValidError:
        return False


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_verification_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(VERIFICATION_TOKEN_BYTES)
    return token, hash_verification_token(token)


def build_verification_url(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"


def is_email_verified(user_doc: dict) -> bool:
    """Legacy users without the field are treated as verified."""
    return user_doc.get("email_verified", True) is not False


async def issue_verification_email(user_doc: dict, users_collection) -> None:
    token, token_hash = generate_verification_token()
    expires_at = datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)

    users_collection.update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "email_verification_token_hash": token_hash,
                "email_verification_expires_at": expires_at,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    await send_verification_email(
        user_doc["email"],
        user_doc.get("full_name") or user_doc["username"],
        build_verification_url(token),
    )


@router.post("/register")
async def register(user: UserRegister):
    """Register a new user and send a verification email."""
    try:
        if not is_valid_email(user.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        users = database.get_collection("users")

        if users.find_one({"email": user.email}):
            raise HTTPException(status_code=400, detail="Email already registered")

        if users.find_one({"username": user.username}):
            raise HTTPException(status_code=400, detail="Username already taken")

        token, token_hash = generate_verification_token()
        expires_at = datetime.utcnow() + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS)

        user_doc = {
            "username": user.username,
            "email": user.email,
            "password_hash": hash_password(user.password),
            "full_name": user.full_name or user.username,
            "role": user.role,
            "kyc_verified": False,
            "email_verified": False,
            "email_verification_token_hash": token_hash,
            "email_verification_expires_at": expires_at,
            "credit_score": 0.0,
            "wallet_address": None,
            "is_active": True,
            "late_return_warnings": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        result = users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id

        ensure_points_document(str(result.inserted_id))

        try:
            await send_verification_email(
                user.email,
                user.full_name or user.username,
                build_verification_url(token),
            )
        except Exception as exc:
            users.delete_one({"_id": result.inserted_id})
            raise HTTPException(
                status_code=503,
                detail=f"Could not send verification email: {exc}",
            ) from exc

        return {
            "message": "Account created. Please check your email to verify your account before signing in.",
            "email_sent": True,
            "user": {
                "id": str(result.inserted_id),
                "username": user.username,
                "email": user.email,
                "full_name": user.full_name or user.username,
                "role": user.role,
                "email_verified": False,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.get("/verify-email")
async def verify_email(token: str):
    """Verify a user's email address using the token from the email link."""
    try:
        if not token:
            raise HTTPException(status_code=400, detail="Verification token is required")

        token_hash = hash_verification_token(token)
        users = database.get_collection("users")
        user_doc = users.find_one({"email_verification_token_hash": token_hash})

        if not user_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")

        expires_at = user_doc.get("email_verification_expires_at")
        if expires_at and expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Verification link has expired")

        users.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "email_verified": True,
                    "updated_at": datetime.utcnow(),
                },
                "$unset": {
                    "email_verification_token_hash": "",
                    "email_verification_expires_at": "",
                },
            },
        )

        create_notification(
            str(user_doc["_id"]),
            "account_update",
            "Email Verified",
            "Your email address was verified successfully. Your account is now fully active.",
        )

        return {
            "message": "Email verified successfully. You can now sign in.",
            "email_verified": True,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email verification failed: {str(e)}")


@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest):
    """Resend the verification email."""
    try:
        if not is_valid_email(payload.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        users = database.get_collection("users")
        user_doc = users.find_one({"email": payload.email})

        if not user_doc:
            return {"message": "If an account exists for that email, a verification link has been sent."}

        if is_email_verified(user_doc):
            return {"message": "This email address is already verified."}

        try:
            await issue_verification_email(user_doc, users)
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Could not send verification email: {exc}",
            ) from exc

        return {"message": "If an account exists for that email, a verification link has been sent."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resend verification email: {str(e)}")


@router.post("/login")
async def login(user: UserLogin):
    """Login user"""
    try:
        users = database.get_collection("users")
        user_doc = users.find_one({"email": user.email})

        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if user_doc.get("is_active") is False:
            user_id = str(user_doc["_id"])
            if is_user_banned(user_id):
                raise HTTPException(status_code=403, detail=get_ban_message())
            raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact an administrator.")

        if not verify_password(user_doc.get("password_hash", ""), user.password):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not is_email_verified(user_doc):
            raise HTTPException(
                status_code=403,
                detail="Please verify your email before signing in. Check your inbox or request a new verification link.",
            )

        payload = {
            "user_id": str(user_doc["_id"]),
            "username": user_doc["username"],
            "email": user_doc["email"],
            "role": user_doc.get("role", "user"),
        }

        token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

        return {
            "token": token,
            "user": {
                "id": str(user_doc["_id"]),
                "username": user_doc["username"],
                "email": user_doc["email"],
                "role": user_doc.get("role", "user"),
                "email_verified": True,
            },
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

        users = database.get_collection("users")
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
            "email_verified": is_email_verified(user_doc),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")
