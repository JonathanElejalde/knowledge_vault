"""
Client IP extraction with trusted-proxy handling.

Only trusts X-Forwarded-For / X-Real-IP when the direct connection is from
a configured trusted proxy. Otherwise uses the socket peer IP to prevent spoofing.
"""

from fastapi import Request

from app.core.config import get_settings

settings = get_settings()


def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request.

    Trusts forwarding headers only when the direct connection is from a
    trusted proxy (TRUSTED_PROXY_IPS). Otherwise uses request.client.host
    to prevent IP spoofing of rate limits and auth logging.
    """
    direct_client = request.client.host if request.client else None
    if not direct_client:
        return "unknown"

    raw = getattr(settings, "TRUSTED_PROXY_IPS", None) or ""
    trusted = [s.strip() for s in raw.split(",") if s.strip()]
    if direct_client not in trusted:
        return direct_client

    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    return direct_client
