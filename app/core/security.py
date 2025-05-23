from datetime import datetime, timedelta, UTC
from typing import Optional, Tuple
from jose import jwt
from passlib.context import CryptContext
from app.core.config import get_settings
from app.db.models import User, RefreshToken
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


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


def generate_refresh_token() -> str:
    """Generate a secure random refresh token."""
    return secrets.token_urlsafe(32)


async def create_refresh_token(
    db: AsyncSession,
    user: User,
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, RefreshToken]:
    """Create a new refresh token for a user."""
    if expires_delta is None:
        expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    token = generate_refresh_token()
    expires_at = datetime.now(UTC) + expires_delta
    
    refresh_token = RefreshToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at
    )
    
    db.add(refresh_token)
    await db.commit()
    await db.refresh(refresh_token)
    
    return token, refresh_token


async def verify_refresh_token(
    db: AsyncSession,
    token: str
) -> Optional[RefreshToken]:
    """Verify a refresh token and return the associated token record if valid."""
    result = await db.execute(
        select(RefreshToken)
        .filter(
            RefreshToken.token == token,
            RefreshToken.expires_at > datetime.now(UTC),
            RefreshToken.is_revoked == False
        )
    )
    return result.scalars().first()


async def revoke_refresh_token(
    db: AsyncSession,
    token: str
) -> bool:
    """Revoke a refresh token by marking it as revoked."""
    result = await db.execute(
        select(RefreshToken)
        .filter(RefreshToken.token == token)
    )
    refresh_token = result.scalars().first()
    
    if refresh_token:
        refresh_token.is_revoked = True
        await db.commit()
        return True
    return False 