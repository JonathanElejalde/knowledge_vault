from datetime import datetime, timedelta, UTC
from typing import Optional, Tuple, List
from urllib.parse import urlparse
from jose import jwt
from passlib.context import CryptContext
from fastapi import Response, Request
from fastapi.security.utils import get_authorization_scheme_param
from app.core.config import get_settings
from app.db.models import User, RefreshToken
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import hashlib

settings = get_settings()


def validate_origin_for_cookie_auth(
    request: Request,
    allowed_origins: List[str]
) -> bool:
    """Validate Origin/Referer header for cookie-authenticated requests.
    
    This provides defense-in-depth against CSRF attacks for requests that:
    1. Use cookie authentication (not Bearer token)
    2. Are state-changing (POST, PUT, DELETE, PATCH)
    
    Returns True if the request is safe, False if it should be rejected.
    
    Logic:
    - If request has Authorization header with Bearer token, skip check (extension auth)
    - For cookie-auth requests, validate Origin header (preferred) or Referer header
    - Origin/Referer must match one of the allowed origins
    - If neither header is present on a state-changing request, reject it
    """
    # Skip validation for safe methods
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return True
    
    # Check if request uses Bearer token auth (extension) - skip CSRF check
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return True
    
    # For cookie-auth requests, validate Origin or Referer
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    
    # Extract origin from Referer if Origin is not present
    check_origin = origin
    if not check_origin and referer:
        try:
            parsed = urlparse(referer)
            check_origin = f"{parsed.scheme}://{parsed.netloc}"
        except Exception:
            check_origin = None
    
    # If no Origin or Referer on a state-changing request, reject
    if not check_origin:
        return False
    
    # Validate against allowed origins
    return check_origin in allowed_origins

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Cookie configuration
ACCESS_TOKEN_COOKIE_NAME = "access_token"
REFRESH_TOKEN_COOKIE_NAME = "refresh_token"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token using SHA-256 for database storage.
    
    We use SHA-256 instead of bcrypt for refresh tokens because:
    1. Refresh tokens are already cryptographically secure random strings
    2. SHA-256 is faster for token verification (important for API performance)
    3. We don't need the slow hashing properties of bcrypt for random tokens
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set secure HTTP-only authentication cookies."""
    # Access token cookie (shorter expiry)
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
        httponly=True,
        secure=settings.COOKIE_SECURE,  # HTTPS only in production
        samesite=settings.COOKIE_SAMESITE,
        path="/"
    )
    
    # Refresh token cookie (longer expiry, restricted path)
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # Convert to seconds
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/v1/auth"  # Restrict to auth endpoints only
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear authentication cookies on logout."""
    response.delete_cookie(
        key=ACCESS_TOKEN_COOKIE_NAME,
        path="/",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        path="/api/v1/auth",
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE
    )


def get_token_from_cookie(request: Request, cookie_name: str) -> Optional[str]:
    """Extract token from HTTP-only cookie."""
    return request.cookies.get(cookie_name)


def get_access_token_from_request(request: Request) -> Optional[str]:
    """Extract access token from Authorization header (Bearer) or auth cookie."""
    auth_header = request.headers.get("Authorization")
    if auth_header:
        scheme, token = get_authorization_scheme_param(auth_header)
        if scheme.lower() == "bearer" and token:
            return token

    return get_token_from_cookie(request, ACCESS_TOKEN_COOKIE_NAME)


def generate_refresh_token() -> str:
    """Generate a secure random refresh token."""
    return secrets.token_urlsafe(32)


async def create_refresh_token(
    db: AsyncSession,
    user: User,
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, RefreshToken]:
    """Create a new refresh token for a user.
    
    Returns the plaintext token (for cookie) and the database record (with hashed token).
    """
    if expires_delta is None:
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Generate plaintext token
    plaintext_token = generate_refresh_token()
    
    # Hash the token for database storage
    hashed_token = hash_refresh_token(plaintext_token)
    
    expires_at = datetime.now(UTC) + expires_delta
    
    refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=hashed_token,  # Store hashed version
        expires_at=expires_at
    )
    
    db.add(refresh_token)
    await db.commit()
    await db.refresh(refresh_token)
    
    # Return plaintext token (for cookie) and database record
    return plaintext_token, refresh_token


async def verify_refresh_token(
    db: AsyncSession,
    token: str
) -> Optional[RefreshToken]:
    """Verify a refresh token and return the associated token record if valid.
    
    Args:
        token: The plaintext token from the cookie
    
    Returns:
        RefreshToken record if valid, None otherwise
    """
    # Hash the provided token to compare with stored hash
    token_hash = hash_refresh_token(token)
    
    result = await db.execute(
        select(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.expires_at > datetime.now(UTC),
            RefreshToken.is_revoked.is_(False)
        )
    )
    return result.scalars().first()


async def rotate_refresh_token(
    db: AsyncSession,
    token: str
) -> Tuple[Optional[str], Optional[RefreshToken], Optional[User]]:
    """Atomically consume a refresh token and issue a new one (single-use rotation).
    
    Uses SELECT ... FOR UPDATE so concurrent requests with the same token
    cannot both succeed; the second sees the token already revoked.
    
    Returns:
        (new_plaintext_token, new_refresh_token_record, user) if valid,
        (None, None, None) if token invalid, expired, revoked, or user inactive.
    """
    token_hash = hash_refresh_token(token)
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .with_for_update()
    )
    row = result.scalars().first()
    if not row or row.expires_at <= datetime.now(UTC) or row.is_revoked:
        return (None, None, None)
    user = await db.get(User, row.user_id)
    if not user or not user.is_active:
        return (None, None, None)
    row.is_revoked = True
    new_plaintext = generate_refresh_token()
    new_hash = hash_refresh_token(new_plaintext)
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_rt = RefreshToken(
        user_id=user.id,
        token_hash=new_hash,
        expires_at=expires_at
    )
    db.add(new_rt)
    await db.commit()
    await db.refresh(new_rt)
    return (new_plaintext, new_rt, user)


async def revoke_refresh_token(
    db: AsyncSession,
    token: str
) -> bool:
    """Revoke a refresh token by marking it as revoked.
    
    Args:
        token: The plaintext token from the cookie
    
    Returns:
        True if token was found and revoked, False otherwise
    """
    # Hash the provided token to find the database record
    token_hash = hash_refresh_token(token)
    
    result = await db.execute(
        select(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
    )
    refresh_token = result.scalars().first()
    
    if refresh_token:
        refresh_token.is_revoked = True
        await db.commit()
        return True
    return False


async def revoke_all_user_refresh_tokens(
    db: AsyncSession,
    user_id: str
) -> int:
    """Revoke all refresh tokens for a user (useful for security incidents).
    
    Args:
        user_id: The user ID whose tokens should be revoked
    
    Returns:
        Number of tokens revoked
    """
    result = await db.execute(
        select(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked.is_(False)
        )
    )
    tokens = result.scalars().all()
    
    revoked_count = 0
    for token in tokens:
        token.is_revoked = True
        revoked_count += 1
    
    if revoked_count > 0:
        await db.commit()
    
    return revoked_count 
