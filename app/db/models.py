from datetime import datetime
from typing import Optional, Dict
from sqlmodel import Field
from sqlalchemy import JSON, String
from app.db.base import BaseModel


class User(BaseModel, table=True):
    """User model for authentication and user management."""
    __tablename__ = "users"

    email: str = Field(sa_type=String(255), unique=True, index=True)
    username: str = Field(sa_type=String(50), unique=True, index=True)
    password_hash: str = Field(sa_type=String(255))
    last_login: Optional[datetime] = Field(default=None)
    is_active: bool = Field(default=True)
    preferences: Dict = Field(default_factory=dict, sa_type=JSON) 