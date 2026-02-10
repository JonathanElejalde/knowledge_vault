from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from app.core.config import get_settings
from typing import AsyncGenerator
from loguru import logger

settings = get_settings()

# Keep production connection usage small for low-memory single-instance deployments.
PROD_POOL_SIZE = 2
PROD_MAX_OVERFLOW = 1
DEFAULT_POOL_SIZE = 20
DEFAULT_MAX_OVERFLOW = 10

pool_size = (
    PROD_POOL_SIZE if settings.ENVIRONMENT == "production" else DEFAULT_POOL_SIZE
)
max_overflow = (
    PROD_MAX_OVERFLOW if settings.ENVIRONMENT == "production" else DEFAULT_MAX_OVERFLOW
)

# Create async engine with connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
    pool_size=pool_size,  # Maximum number of connections to keep
    max_overflow=max_overflow,  # Additional burst connections beyond pool_size
    pool_timeout=30,  # Seconds to wait before giving up on getting a connection from the pool
    pool_recycle=1800,  # Recycle connections after 30 minutes
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except SQLAlchemyError as e:
            logger.error("Database error occurred: {}", str(e))
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> bool:
    """Check if the database connection is working."""
    try:
        async with AsyncSessionLocal() as session:
            # Try to execute a simple query using text()
            await session.execute(text("SELECT 1"))
            return True
    except SQLAlchemyError as e:
        logger.error("Database connection check failed: {}", str(e))
        return False
