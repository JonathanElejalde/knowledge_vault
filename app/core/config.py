from typing import Optional, List
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
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    ALLOWED_HEADERS: List[str] = ["*"]
    ALLOW_CREDENTIALS: bool = True  # Enable credentials for cookie support

    # Security settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30  # 30 days for refresh tokens

    # Cookie security settings
    COOKIE_SECURE: bool = False  # Will be overridden by environment variable in production
    COOKIE_SAMESITE: str = "lax"  # "strict" for production, "lax" for development
    COOKIE_HTTP_ONLY: bool = True

    # Rate limiting settings (requests per minute) - Industry standard values
    RATE_LIMIT_LOGIN: str = "5/minute"  # 5 login attempts per minute per IP
    RATE_LIMIT_LOGIN_USER: str = "3/minute"  # 3 attempts per minute per user
    RATE_LIMIT_REGISTER: str = "2/minute"  # 2 registrations per minute per IP
    RATE_LIMIT_REFRESH: str = "10/minute"  # 10 refresh attempts per minute
    RATE_LIMIT_GENERAL: str = "100/minute"  # 100 general API requests per minute

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


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings() 