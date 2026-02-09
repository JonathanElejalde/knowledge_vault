from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings."""
    # Database settings
    DB_USERNAME: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: str
    DB_NAME: str
    DATABASE_ECHO: bool

    # Application settings
    ENVIRONMENT: str
    ENABLE_DOCS: bool = True  # Set to False in production for security

    # CORS settings
    # Note: Origins list is expanded in main.py to include 127.0.0.1 variants for development
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    ALLOWED_EXTENSION_ORIGINS: List[str] = []
    ALLOW_CREDENTIALS: bool = True  # Enable credentials for cookie support

    # Security settings
    SECRET_KEY: str = Field(..., min_length=64)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days for refresh tokens

    # Cookie security settings
    COOKIE_SECURE: bool = False  # Set to True in production (HTTPS only)
    COOKIE_SAMESITE: str = "lax"  # "strict" for production, "lax" for development
    COOKIE_HTTP_ONLY: bool = True

    # Trusted proxy IPs (comma-separated): only when the direct connection is from
    # one of these do we trust X-Forwarded-For / X-Real-IP. Empty = never trust.
    TRUSTED_PROXY_IPS: str = ""

    # Rate limiting settings (requests per minute)
    RATE_LIMIT_LOGIN: str = "5/minute"
    RATE_LIMIT_LOGIN_ACCOUNT: str = "5/minute"  # Per email/account (defense against credential stuffing)
    RATE_LIMIT_LOGIN_USER: str = "3/minute"
    RATE_LIMIT_REGISTER: str = "2/minute"
    RATE_LIMIT_REFRESH: str = "10/minute"
    RATE_LIMIT_GENERAL: str = "100/minute"

    # AI
    DEEPSEEK_API_KEY: str
    OPENAI_API_KEY: str
    
    # Vector Search Settings
    VECTOR_DISTANCE: str = "cosine"
    VECTOR_DIM: int = 1536
    VECTOR_BACKEND: str = "pg"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USERNAME}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars (e.g. VITE_* for frontend); backend only uses fields above


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
