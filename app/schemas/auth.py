from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, UUID4


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema."""
    sub: str  # subject (user identifier)
    exp: Optional[datetime] = None


class UserCreate(BaseModel):
    """User registration schema."""
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    """Public user data schema."""
    id: UUID4
    email: EmailStr
    username: str
    is_active: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True 