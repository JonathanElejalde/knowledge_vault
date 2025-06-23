from datetime import datetime, UTC, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    revoke_all_user_refresh_tokens,
    set_auth_cookies,
    clear_auth_cookies,
    get_token_from_cookie,
    REFRESH_TOKEN_COOKIE_NAME
)
from app.db.models import User
from app.schemas.auth import (
    UserCreate,
    UserPublic,
    RefreshTokenResponse
)
from app.api.dependencies import (
    get_current_active_user,
    login_rate_limit,
    register_rate_limit,
    refresh_rate_limit
)
from app.db.session import get_db
from app.core.config import get_settings
from loguru import logger

settings = get_settings()
router = APIRouter()


@router.post("/register", response_model=UserPublic)
async def register(
    response: Response,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, register_rate_limit]  # Rate limit: 2 registrations per minute per IP
) -> UserPublic:
    """Register a new user."""
    # Check if user with email exists
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        logger.warning(f"SECURITY: Registration attempt with existing email: {user_in.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username is taken
    result = await db.execute(select(User).filter(User.username == user_in.username))
    existing_username = result.scalars().first()
    if existing_username:
        logger.warning(f"SECURITY: Registration attempt with existing username: {user_in.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    user = User(
        email=user_in.email,
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token, _ = await create_refresh_token(db=db, user=user)
    
    # Set HTTP-only cookies
    set_auth_cookies(response, access_token, refresh_token)
    
    # Log successful registration
    logger.info(f"SECURITY: User registered successfully: {user.email} (ID: {user.id})")
    
    return UserPublic.model_validate(user)


@router.post("/login/access-token", response_model=UserPublic)
async def login_access_token(
    request: Request,
    response: Response,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, login_rate_limit]  # Rate limit: 5 attempts per minute per IP
) -> UserPublic:
    """OAuth2 compatible token login, set HTTP-only cookies for future requests."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    # Find user by email
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    if not user:
        logger.warning(f"SECURITY: Login attempt with non-existent email: {form_data.username} from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        logger.warning(f"SECURITY: Failed login attempt for user: {user.email} from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.now(UTC)
    await db.commit()
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token, _ = await create_refresh_token(db=db, user=user)
    
    # Set HTTP-only cookies
    set_auth_cookies(response, access_token, refresh_token)
    
    # Log successful login
    logger.info(f"SECURITY: User logged in successfully: {user.email} from IP: {client_ip}")
    
    return UserPublic.model_validate(user)


@router.post("/refresh-token", response_model=UserPublic)
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, refresh_rate_limit]  # Rate limit: 10 requests per minute per user
) -> UserPublic:
    """Get a new access token using a refresh token from HTTP-only cookie."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    # Get refresh token from cookie
    refresh_token_value = get_token_from_cookie(request, REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_value:
        logger.warning(f"SECURITY: Refresh token request without token from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify refresh token
    refresh_token = await verify_refresh_token(db=db, token=refresh_token_value)
    if not refresh_token:
        logger.warning(f"SECURITY: Invalid refresh token used from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user
    user = await db.get(User, refresh_token.user_id)
    if not user or not user.is_active:
        logger.warning(f"SECURITY: Refresh token for inactive/non-existent user: {refresh_token.user_id} from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    # Create new refresh token (rotate refresh token)
    new_refresh_token, _ = await create_refresh_token(db=db, user=user)
    
    # Revoke old refresh token
    await revoke_refresh_token(db=db, token=refresh_token_value)
    
    # Set new HTTP-only cookies
    set_auth_cookies(response, access_token, new_refresh_token)
    
    # Log successful token refresh
    logger.info(f"SECURITY: Token refreshed for user: {user.email} from IP: {client_ip}")
    
    return UserPublic.model_validate(user)


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    """Logout by revoking the refresh token and clearing cookies."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    # Get refresh token from cookie
    refresh_token_value = get_token_from_cookie(request, REFRESH_TOKEN_COOKIE_NAME)
    
    user_info = "unknown"
    if refresh_token_value:
        # Try to get user info for logging before revoking
        try:
            refresh_token = await verify_refresh_token(db=db, token=refresh_token_value)
            if refresh_token:
                user = await db.get(User, refresh_token.user_id)
                if user:
                    user_info = user.email
        except Exception:
            pass
        
        # Revoke refresh token
        await revoke_refresh_token(db=db, token=refresh_token_value)
    
    # Clear HTTP-only cookies
    clear_auth_cookies(response)
    
    # Log logout
    logger.info(f"SECURITY: User logged out: {user_info} from IP: {client_ip}")
    
    return {"message": "Successfully logged out"}


@router.post("/revoke-all-tokens")
async def revoke_all_tokens(
    request: Request,
    response: Response,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    """Revoke all refresh tokens for the current user (security endpoint)."""
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    # Revoke all refresh tokens for this user
    revoked_count = await revoke_all_user_refresh_tokens(db=db, user_id=str(current_user.id))
    
    # Clear HTTP-only cookies
    clear_auth_cookies(response)
    
    # Log security action
    logger.warning(
        f"SECURITY: All refresh tokens revoked for user: {current_user.email} | "
        f"Tokens revoked: {revoked_count} | "
        f"IP: {client_ip}"
    )
    
    return {
        "message": "All refresh tokens have been revoked",
        "tokens_revoked": revoked_count
    }


@router.get("/me", response_model=UserPublic)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> UserPublic:
    """Get current user."""
    return UserPublic.model_validate(current_user) 