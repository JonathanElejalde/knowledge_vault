from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from app.core.config import get_settings
from typing import AsyncGenerator
from loguru import logger

settings = get_settings()

# Create async engine with connection pooling
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
    pool_size=20,  # Maximum number of connections to keep
    max_overflow=10,  # Maximum number of connections that can be created beyond pool_size
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
