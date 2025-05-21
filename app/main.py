from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import health, auth
from app.core.config import get_settings
from app.core.logging import setup_logging
from loguru import logger
from contextlib import asynccontextmanager

settings = get_settings()

# Setup logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting Knowledge Vault API")
    yield
    logger.info("Shutting down Knowledge Vault API")

app = FastAPI(
    title="Knowledge Vault API",
    description="API for the Knowledge Vault application",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modify this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"]) 