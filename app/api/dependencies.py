from typing import Annotated, List
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings
from app.core.security import (
    get_access_token_from_request,
    validate_origin_for_cookie_auth,
)
from app.core.client_ip import get_client_ip
from app.core.rate_limiting import check_rate_limit
from app.db.models import User
from app.schemas.auth import TokenData
from app.db.session import get_db
from loguru import logger
import json

settings = get_settings()


def _get_all_allowed_origins() -> List[str]:
    """Get all allowed origins including extension origins."""
    origins = settings.ALLOWED_ORIGINS
    extension_origins = settings.ALLOWED_EXTENSION_ORIGINS

    # Parse if they're JSON strings
    if isinstance(origins, str):
        try:
            origins = json.loads(origins)
        except json.JSONDecodeError:
            origins = [origins]

    if isinstance(extension_origins, str):
        try:
            extension_origins = json.loads(extension_origins)
        except json.JSONDecodeError:
            extension_origins = [extension_origins]

    all_origins = list(set(origins + extension_origins))

    # In development, add both localhost and 127.0.0.1 variants
    if settings.ENVIRONMENT == "development":
        dev_origins = set(all_origins)
        for origin in list(dev_origins):
            if "localhost" in origin:
                dev_origins.add(origin.replace("localhost", "127.0.0.1"))
            if "127.0.0.1" in origin:
                dev_origins.add(origin.replace("127.0.0.1", "localhost"))
        return list(dev_origins)

    return all_origins


async def validate_csrf_origin(request: Request) -> bool:
    """Dependency to validate Origin/Referer for cookie-authenticated state-changing requests.

    This provides defense-in-depth CSRF protection alongside SameSite=Lax cookies.
    Raises HTTP 403 if the origin validation fails.
    """
    allowed_origins = _get_all_allowed_origins()

    if not validate_origin_for_cookie_auth(request, allowed_origins):
        client_ip = get_client_ip(request)
        origin = request.headers.get("Origin", "missing")
        referer = request.headers.get("Referer", "missing")

        logger.warning(
            f"SECURITY: CSRF origin validation failed | "
            f"IP: {client_ip} | "
            f"Method: {request.method} | "
            f"Path: {request.url.path} | "
            f"Origin: {origin} | "
            f"Referer: {referer}"
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid request origin"
        )

    return True


# Pre-configured CSRF protection dependency
csrf_protect = Depends(validate_csrf_origin)


async def get_current_user(
    request: Request, db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Get the current authenticated user from the JWT token in HTTP-only cookie."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Extract token from HTTP-only cookie
    token = get_access_token_from_request(request)
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
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
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
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
                token = get_access_token_from_request(request)
                if token:
                    payload = jwt.decode(
                        token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
                    )
                    user_id = payload.get("sub")
            except (JWTError, Exception):
                # If we can't get user ID, fall back to IP-based limiting
                pass

        # Check rate limit
        is_allowed, rate_info = check_rate_limit(
            request, rate_limit_string, identifier_type, user_id
        )

        if not is_allowed:
            # Log security event
            client_ip = get_client_ip(request)
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
                    "Retry-After": str(rate_info["retry_after"]),
                },
            )

        return True

    return rate_limit_dependency


# Pre-configured rate limiting dependencies for common use cases
login_rate_limit = Depends(
    create_rate_limit_dependency(settings.RATE_LIMIT_LOGIN, "ip")
)
login_user_rate_limit = Depends(
    create_rate_limit_dependency(settings.RATE_LIMIT_LOGIN_USER, "user")
)
register_rate_limit = Depends(
    create_rate_limit_dependency(settings.RATE_LIMIT_REGISTER, "ip")
)
refresh_rate_limit = Depends(
    create_rate_limit_dependency(settings.RATE_LIMIT_REFRESH, "user")
)
general_rate_limit = Depends(
    create_rate_limit_dependency(settings.RATE_LIMIT_GENERAL, "user")
)
