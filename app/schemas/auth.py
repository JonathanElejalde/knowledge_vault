import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, UUID4

# Password policy: min 8 chars, at least one upper, lower, digit, special (@$!%*?&.)
_PASSWORD_PATTERN = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]{8,}$"
)
_PASSWORD_MAX_LEN = 128


def _normalize_email(v: str) -> str:
    return v.lower().strip() if isinstance(v, str) else v


def _validate_password(v: str) -> str:
    if len(v) > _PASSWORD_MAX_LEN:
        raise ValueError(f"Password must be at most {_PASSWORD_MAX_LEN} characters")
    if not _PASSWORD_PATTERN.match(v):
        raise ValueError(
            "Password must be at least 8 characters with one uppercase, one lowercase, "
            "one number and one special character (@$!%*?&.)"
        )
    return v


class Token(BaseModel):
    """Token response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires
    user: "UserPublic"


class TokenData(BaseModel):
    """Token data schema."""

    sub: str  # subject (user identifier)
    exp: Optional[datetime] = None


class RefreshTokenCreate(BaseModel):
    """Refresh token creation schema."""

    refresh_token: str


class RefreshTokenResponse(BaseModel):
    """Refresh token response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


class UserCreate(BaseModel):
    """User registration schema."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=_PASSWORD_MAX_LEN)

    _normalize_email = field_validator("email", mode="before")(_normalize_email)
    _validate_password = field_validator("password", mode="after")(_validate_password)


class UserLogin(BaseModel):
    """User login schema."""

    email: EmailStr
    password: str

    _normalize_email = field_validator("email", mode="before")(_normalize_email)


class UserPublic(BaseModel):
    """Public user data schema."""

    id: UUID4
    email: EmailStr
    username: str
    is_active: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# Update Token to include UserPublic
Token.model_rebuild()
