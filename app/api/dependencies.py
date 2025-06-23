from typing import Annotated
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.security import get_token_from_cookie, ACCESS_TOKEN_COOKIE_NAME
from app.core.rate_limiting import check_rate_limit
from app.db.models import User
from app.schemas.auth import TokenData
from app.db.session import get_db
from loguru import logger

settings = get_settings()


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Get the current authenticated user from the JWT token in HTTP-only cookie."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Extract token from HTTP-only cookie
    token = get_token_from_cookie(request, ACCESS_TOKEN_COOKIE_NAME)
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(sub=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await db.get(User, token_data.sub)
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


# Rate limiting dependencies
def create_rate_limit_dependency(rate_limit_string: str, identifier_type: str = "ip"):
    """
    Create a rate limiting dependency for specific endpoints.
    
    Args:
        rate_limit_string: Rate limit (e.g., "5/minute")
        identifier_type: Type of identifier ("ip", "user", "ip_user")
    """
    async def rate_limit_dependency(request: Request):
        """Rate limiting dependency function."""
        user_id = None
        
        # For user-based rate limiting, try to get user ID from token
        if identifier_type in ["user", "ip_user"]:
            try:
                token = get_token_from_cookie(request, ACCESS_TOKEN_COOKIE_NAME)
                if token:
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    user_id = payload.get("sub")
            except (JWTError, Exception):
                # If we can't get user ID, fall back to IP-based limiting
                pass
        
        # Check rate limit
        is_allowed, rate_info = check_rate_limit(
            request, 
            rate_limit_string, 
            identifier_type, 
            user_id
        )
        
        if not is_allowed:
            # Log security event
            client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
            endpoint = f"{request.method} {request.url.path}"
            logger.warning(
                f"SECURITY: Rate limit blocked request | "
                f"IP: {client_ip} | "
                f"Endpoint: {endpoint} | "
                f"Limit: {rate_limit_string} | "
                f"Identifier: {identifier_type}"
            )
            
            # Return HTTP 429 with rate limit headers
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {rate_info['retry_after']} seconds.",
                headers={
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": str(rate_info["remaining"]),
                    "X-RateLimit-Reset": str(rate_info["reset"]),
                    "Retry-After": str(rate_info["retry_after"])
                }
            )
        
        return True
    
    return rate_limit_dependency


# Pre-configured rate limiting dependencies for common use cases
login_rate_limit = Depends(create_rate_limit_dependency(settings.RATE_LIMIT_LOGIN, "ip"))
login_user_rate_limit = Depends(create_rate_limit_dependency(settings.RATE_LIMIT_LOGIN_USER, "user"))
register_rate_limit = Depends(create_rate_limit_dependency(settings.RATE_LIMIT_REGISTER, "ip"))
refresh_rate_limit = Depends(create_rate_limit_dependency(settings.RATE_LIMIT_REFRESH, "user"))
general_rate_limit = Depends(create_rate_limit_dependency(settings.RATE_LIMIT_GENERAL, "user")) 