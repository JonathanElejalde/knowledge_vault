import sys
from loguru import logger
from app.core.config import get_settings

settings = get_settings()


def setup_logging():
    """Configure Loguru logging."""
    # Remove default handler
    logger.remove()

    # Add console handler with custom format
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
        "<level>{message}</level>",
        level="INFO" if settings.ENVIRONMENT == "production" else "DEBUG",
        colorize=True,
    )

    # Add file handler for production
    if settings.ENVIRONMENT == "production":
        logger.add(
            "logs/app.log",
            rotation="500 MB",
            retention="10 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
            level="INFO",
        )
