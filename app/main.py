from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.api.v1.endpoints import health
from app.api.v1.api import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.core.security import validate_origin_for_cookie_auth
from app.core.client_ip import get_client_ip
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


def get_allowed_origins():
    """Get allowed origins with development-friendly additions.
    
    In development, adds both localhost and 127.0.0.1 variants since
    browsers treat them as different origins.
    """
    origins = parse_allowed_origins(settings.ALLOWED_ORIGINS)
    extension_origins = parse_allowed_origins(settings.ALLOWED_EXTENSION_ORIGINS)
    origins = list({*origins, *extension_origins})
    
    if settings.ENVIRONMENT == "development":
        dev_origins = set(origins)
        for origin in list(dev_origins):
            if "localhost" in origin:
                dev_origins.add(origin.replace("localhost", "127.0.0.1"))
            if "127.0.0.1" in origin:
                dev_origins.add(origin.replace("127.0.0.1", "localhost"))
        return list(dev_origins)
    
    return origins


def get_trusted_hosts(origins: list, environment: str) -> list:
    """Get list of trusted hosts for TrustedHostMiddleware."""
    if environment == "development":
        return ["*"]  # Allow all hosts in development (needed for WSL)
    
    hosts = ["localhost", "127.0.0.1"]
    
    for origin in origins:
        if isinstance(origin, str):
            hostname = origin.replace("http://", "").replace("https://", "")
            hostname = hostname.split(":")[0]
            if hostname and hostname not in hosts:
                hosts.append(hostname)
    
    if environment == "production":
        hosts.append("*.fly.dev")
    
    return hosts


# Parse configuration
allowed_origins = get_allowed_origins()

# Allowed headers for CORS (wildcards not allowed when credentials=True)
ALLOWED_HEADERS = [
    "Accept",
    "Accept-Language",
    "Content-Language",
    "Content-Type",
    "Authorization",
    "X-Timezone",
    "X-Requested-With",
    "Cache-Control",
    "Pragma",
    "Origin",
]

ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]


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
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)


# CSRF Origin validation middleware
@app.middleware("http")
async def csrf_origin_validation(request: Request, call_next):
    """Validate Origin/Referer for cookie-authenticated state-changing requests.
    
    This provides defense-in-depth CSRF protection alongside SameSite=Lax cookies.
    Only validates requests that:
    1. Are state-changing (POST, PUT, DELETE, PATCH)
    2. Use cookie authentication (not Bearer token)
    """
    if not validate_origin_for_cookie_auth(request, allowed_origins):
        client_ip = get_client_ip(request)
        origin = request.headers.get("Origin", "missing")
        referer = request.headers.get("Referer", "missing")
        
        logger.warning(
            f"SECURITY: CSRF origin validation failed | "
            f"IP: {client_ip} | "
            f"Method: {request.method} | "
            f"Path: {request.url.path} | "
            f"Origin: {origin} | "
            f"Referer: {referer}"
        )
        
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid request origin"}
        )
    
    return await call_next(request)


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy
    if settings.ENABLE_DOCS and request.url.path in ["/docs", "/redoc"]:
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
        csp_policy = "default-src 'self';"
    else:
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


# CORS Middleware - Must be added before TrustedHostMiddleware
# Middleware execution order is REVERSE of add order
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
    expose_headers=["Set-Cookie"],
)

# Trusted Host Middleware (runs first due to being added last)
trusted_hosts = get_trusted_hosts(allowed_origins, settings.ENVIRONMENT)
logger.info(f"Trusted hosts: {trusted_hosts}")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=trusted_hosts
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(api_router, prefix="/api/v1")
