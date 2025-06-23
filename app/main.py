from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api.v1.endpoints import health
from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from loguru import logger
from contextlib import asynccontextmanager
import json

settings = get_settings()

# Setup logging
setup_logging()

def parse_allowed_origins(origins):
    """Parse ALLOWED_ORIGINS from environment variable (could be JSON string or list)."""
    if isinstance(origins, str):
        try:
            parsed = json.loads(origins)
            return parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            return [origins]
    return origins

def parse_allowed_methods(methods):
    """Parse ALLOWED_METHODS from environment variable (could be JSON string or list)."""
    if isinstance(methods, str):
        try:
            parsed = json.loads(methods)
            return parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            return [methods]
    return methods

def parse_allowed_headers(headers):
    """Parse ALLOWED_HEADERS from environment variable (could be JSON string or list)."""
    if isinstance(headers, str):
        try:
            parsed = json.loads(headers)
            return parsed if isinstance(parsed, list) else [parsed]
        except json.JSONDecodeError:
            return [headers]
    return headers

# Parse configuration properly
allowed_origins = parse_allowed_origins(settings.ALLOWED_ORIGINS)
allowed_methods = parse_allowed_methods(settings.ALLOWED_METHODS)
allowed_headers = parse_allowed_headers(settings.ALLOWED_HEADERS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("Starting Knowledge Vault API")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Allowed origins: {allowed_origins}")
    logger.info(f"Credentials allowed: {settings.ALLOW_CREDENTIALS}")
    yield
    logger.info("Shutting down Knowledge Vault API")

app = FastAPI(
    title="Knowledge Vault API",
    description="API for the Knowledge Vault application",
    version="1.0.0",
    lifespan=lifespan,
    # Completely disable docs in production for security
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)

# Configure trusted hosts - Include both frontend origins AND backend hostname
def get_trusted_hosts(origins, environment):
    """Get list of trusted hosts for TrustedHostMiddleware."""
    hosts = ["localhost", "127.0.0.1", "*.localhost"]
    
    # Add frontend origins (from ALLOWED_ORIGINS)
    for origin in origins:
        if isinstance(origin, str):
            # Remove protocol and extract hostname
            hostname = origin.replace("http://", "").replace("https://", "")
            # Remove port if present
            hostname = hostname.split(":")[0]
            if hostname and hostname not in hosts:
                hosts.append(hostname)
    
    # Add backend hostname based on environment
    if environment == "production":
        # Add Fly.io app hostname - replace with your actual app name
        hosts.extend([
            "*.fly.dev"  # Allow all fly.dev subdomains for flexibility
        ])
    
    return hosts

# Add trusted host middleware for security
trusted_hosts = get_trusted_hosts(allowed_origins, settings.ENVIRONMENT)
logger.info(f"Trusted hosts: {trusted_hosts}")
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=trusted_hosts
)

# Configure CORS with environment-based settings for cross-origin authentication
logger.info(f"CORS Configuration - Origins: {allowed_origins}, Credentials: {settings.ALLOW_CREDENTIALS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=settings.ALLOW_CREDENTIALS,  # Critical for cookie support
    allow_methods=allowed_methods,
    allow_headers=allowed_headers,
    # Essential for cross-origin cookies to work properly
    expose_headers=["Set-Cookie", "Authorization"] if settings.ENVIRONMENT == "production" else [],
)

# Add security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Security headers - Apply to all endpoints
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy - Strict policy for production API
    if settings.ENABLE_DOCS and request.url.path in ["/docs", "/redoc"]:
        # Swagger UI requires specific external resources and inline scripts (development only)
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self';"
        )
    elif settings.ENABLE_DOCS and request.url.path == "/openapi.json":
        # OpenAPI JSON endpoint (development only)
        csp_policy = "default-src 'self';"
    else:
        # Strict CSP for production API endpoints
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            f"connect-src 'self' {' '.join(allowed_origins)}; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
    
    response.headers["Content-Security-Policy"] = csp_policy
    
    return response

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(api_router, prefix="/api/v1") 