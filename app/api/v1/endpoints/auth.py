from datetime import datetime, UTC
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import verify_password, get_password_hash, create_access_token
from app.db.models import User
from app.schemas.auth import Token, UserCreate, UserPublic
from app.api.dependencies import get_current_active_user
from app.db.session import get_db

router = APIRouter()


@router.post("/register", response_model=UserPublic)
async def register(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Register a new user."""
    # Check if user with email exists
    result = await db.execute(select(User).filter(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username is taken
    result = await db.execute(select(User).filter(User.username == user_in.username))
    existing_username = result.scalars().first()
    if existing_username:
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
    
    return user


@router.post("/login/access-token", response_model=Token)
async def login_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Token:
    """OAuth2 compatible token login, get an access token for future requests."""
    # Find user by email
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.now(UTC)
    await db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token)


@router.get("/me", response_model=UserPublic)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Get current user."""
    return current_user 