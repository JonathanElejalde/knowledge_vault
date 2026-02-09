from datetime import datetime, UTC, timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    rotate_refresh_token,
    revoke_refresh_token,
    revoke_all_user_refresh_tokens,
    set_auth_cookies,
    clear_auth_cookies,
    get_token_from_cookie,
    REFRESH_TOKEN_COOKIE_NAME
)
from app.db.models import User
from app.schemas.auth import (
    Token,
    UserLogin,
    UserCreate,
    UserPublic,
    RefreshTokenCreate,
)
from app.api.dependencies import (
    get_current_active_user,
    login_rate_limit,
    register_rate_limit,
    refresh_rate_limit
)
from app.db.session import get_db
from app.core.config import get_settings
from app.core.client_ip import get_client_ip
from loguru import logger

settings = get_settings()
router = APIRouter()


async def _authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
    client_ip: str
) -> User:
    result = await db.execute(select(User).filter(func.lower(User.email) == email.lower()))
    user = result.scalars().first()
    if not user:
        logger.warning("SECURITY: Login attempt for non-existent account from IP: [REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(password, user.password_hash):
        logger.warning(f"SECURITY: Failed login attempt (user_id={user.id}) from IP: [REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def _create_access_token_for_user(user: User) -> str:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )


def _build_extension_token_response(
    user: User,
    access_token: str,
    refresh_token: str
) -> Token:
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserPublic.model_validate(user),
    )


@router.post("/register", response_model=UserPublic)
async def register(
    response: Response,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, register_rate_limit]  # Rate limit: 2 registrations per minute per IP
) -> UserPublic:
    """Register a new user."""
    # Check if user with email exists (case-insensitive; user_in.email is normalized to lowercase)
    result = await db.execute(select(User).filter(func.lower(User.email) == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        logger.warning("SECURITY: Registration attempt with existing account")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please use a different email or username.",
        )

    # Check if username is taken
    result = await db.execute(select(User).filter(User.username == user_in.username))
    existing_username = result.scalars().first()
    if existing_username:
        logger.warning("SECURITY: Registration attempt with existing account")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please use a different email or username.",
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
    logger.info(f"SECURITY: User registered successfully (user_id={user.id})")
    
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
    client_ip = get_client_ip(request)
    user = await _authenticate_user(
        db=db,
        email=form_data.username,
        password=form_data.password,
        client_ip=client_ip
    )
    
    # Update last login
    user.last_login = datetime.now(UTC)
    await db.commit()
    
    # Create access token
    access_token = _create_access_token_for_user(user)
    
    # Create refresh token
    refresh_token, _ = await create_refresh_token(db=db, user=user)
    
    # Set HTTP-only cookies
    set_auth_cookies(response, access_token, refresh_token)
    
    # Log successful login
    logger.info(f"SECURITY: User logged in successfully (user_id={user.id}) from IP: [REDACTED]")
    
    return UserPublic.model_validate(user)


@router.post("/refresh-token", response_model=UserPublic)
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, refresh_rate_limit]  # Rate limit: 10 requests per minute per user
) -> UserPublic:
    """Get a new access token using a refresh token from HTTP-only cookie."""
    client_ip = get_client_ip(request)
    
    # Get refresh token from cookie
    refresh_token_value = get_token_from_cookie(request, REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_value:
        logger.warning("SECURITY: Refresh token request without token from IP: [REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Atomic rotate: consume old token and issue new one (single-use, no replay window)
    new_refresh_token, _, user = await rotate_refresh_token(db=db, token=refresh_token_value)
    if not user:
        logger.warning("SECURITY: Invalid refresh token used from IP: [REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = _create_access_token_for_user(user)
    set_auth_cookies(response, access_token, new_refresh_token)
    
    # Log successful token refresh
    logger.info(f"SECURITY: Token refreshed (user_id={user.id}) from IP: [REDACTED]")
    
    return UserPublic.model_validate(user)


@router.post("/extension/login", response_model=Token)
async def extension_login(
    request: Request,
    payload: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, login_rate_limit]
) -> Token:
    """Login endpoint for browser extensions using bearer + refresh tokens."""
    client_ip = get_client_ip(request)
    user = await _authenticate_user(
        db=db,
        email=payload.email,
        password=payload.password,
        client_ip=client_ip
    )

    user.last_login = datetime.now(UTC)
    await db.commit()

    access_token = _create_access_token_for_user(user)
    refresh_token, _ = await create_refresh_token(db=db, user=user)

    logger.info(f"SECURITY: Extension login successful (user_id={user.id}) from IP: [REDACTED]")

    return _build_extension_token_response(
        user=user,
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.post("/extension/refresh-token", response_model=Token)
async def extension_refresh_token(
    request: Request,
    payload: RefreshTokenCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, refresh_rate_limit]
) -> Token:
    """Rotate refresh token and return new bearer token pair for extensions."""
    client_ip = get_client_ip(request)

    new_refresh_token, _, user = await rotate_refresh_token(db=db, token=payload.refresh_token)
    if not user:
        logger.warning("SECURITY: Invalid extension refresh token used from IP: [REDACTED]")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = _create_access_token_for_user(user)
    logger.info(f"SECURITY: Extension token refreshed (user_id={user.id}) from IP: [REDACTED]")

    return _build_extension_token_response(
        user=user,
        access_token=access_token,
        refresh_token=new_refresh_token
    )


@router.post("/extension/logout")
async def extension_logout(
    request: Request,
    payload: RefreshTokenCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    """Logout extension session by revoking provided refresh token."""
    client_ip = get_client_ip(request)
    revoked = await revoke_refresh_token(db=db, token=payload.refresh_token)
    logger.info(
        f"SECURITY: Extension logout token revocation {'succeeded' if revoked else 'not_found'} from IP: [REDACTED]"
    )
    return {"message": "Successfully logged out"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    """Logout by revoking the refresh token and clearing cookies."""
    client_ip = get_client_ip(request)
    
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
                    user_info = f"user_id={user.id}"
        except Exception:
            pass
        
        # Revoke refresh token
        await revoke_refresh_token(db=db, token=refresh_token_value)
    
    # Clear HTTP-only cookies
    clear_auth_cookies(response)
    
    # Log logout
    logger.info(f"SECURITY: User logged out: {user_info} from IP: [REDACTED]")
    
    return {"message": "Successfully logged out"}


@router.post("/revoke-all-tokens")
async def revoke_all_tokens(
    request: Request,
    response: Response,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> dict:
    """Revoke all refresh tokens for the current user (security endpoint)."""
    client_ip = get_client_ip(request)
    
    # Revoke all refresh tokens for this user
    revoked_count = await revoke_all_user_refresh_tokens(db=db, user_id=str(current_user.id))
    
    # Clear HTTP-only cookies
    clear_auth_cookies(response)
    
    # Log security action
    logger.warning(
        f"SECURITY: All refresh tokens revoked (user_id={current_user.id}) | "
        f"Tokens revoked: {revoked_count} | IP: [REDACTED]"
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
