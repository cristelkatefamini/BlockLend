import jwt
from fastapi import HTTPException, Depends, Header
from config.settings import settings
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
        return data
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
