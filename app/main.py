from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api.v1.endpoints import health
from app.api.v1.api import api_router
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
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Allowed origins: {settings.ALLOWED_ORIGINS}")
    logger.info(f"Credentials allowed: {settings.ALLOW_CREDENTIALS}")
    yield
    logger.info("Shutting down Knowledge Vault API")

app = FastAPI(
    title="Knowledge Vault API",
    description="API for the Knowledge Vault application",
    version="1.0.0",
    lifespan=lifespan,
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.localhost"] + 
                  [origin.replace("http://", "").replace("https://", "") for origin in settings.ALLOWED_ORIGINS]
)

# Configure CORS with environment-based settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=settings.ALLOW_CREDENTIALS,  # Critical for cookie support
    allow_methods=settings.ALLOWED_METHODS,
    allow_headers=settings.ALLOWED_HEADERS,
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        f"connect-src 'self' {' '.join(settings.ALLOWED_ORIGINS)}; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self';"
    )
    response.headers["Content-Security-Policy"] = csp_policy
    
    return response

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(api_router, prefix="/api/v1") 