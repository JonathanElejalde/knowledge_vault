"""
In-memory rate limiting module for Knowledge Vault.

Uses sliding window algorithm with automatic cleanup.
Production-ready for single-instance deployments.
"""

import time
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, deque
from fastapi import Request
from loguru import logger
from app.core.config import get_settings

settings = get_settings()


class SlidingWindowRateLimiter:
    """
    In-memory sliding window rate limiter.
    
    Tracks requests in a time window and automatically cleans up old entries.
    Thread-safe for single-process deployments.
    """
    
    def __init__(self):
        # Store request timestamps for each key
        self._windows: Dict[str, deque] = defaultdict(deque)
        self._last_cleanup = time.time()
        self._cleanup_interval = 300  # Cleanup every 5 minutes
    
    def _cleanup_old_entries(self) -> None:
        """Remove expired entries to prevent memory leaks."""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return
            
        cutoff_time = now - 3600  # Remove entries older than 1 hour
        keys_to_remove = []
        
        for key, window in self._windows.items():
            # Remove old timestamps
            while window and window[0] < cutoff_time:
                window.popleft()
            
            # Remove empty windows
            if not window:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self._windows[key]
        
        self._last_cleanup = now
        
        if keys_to_remove:
            logger.debug(f"Rate limiter cleanup: removed {len(keys_to_remove)} expired entries")
    
    def is_allowed(self, key: str, limit: int, window_seconds: int) -> Tuple[bool, Dict[str, int]]:
        """
        Check if request is allowed within rate limit.
        
        Args:
            key: Unique identifier for the rate limit (IP, user, etc.)
            limit: Maximum number of requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        now = time.time()
        window_start = now - window_seconds
        
        # Cleanup old entries periodically
        self._cleanup_old_entries()
        
        # Get or create window for this key
        window = self._windows[key]
        
        # Remove expired timestamps from window
        while window and window[0] < window_start:
            window.popleft()
        
        # Check if limit is exceeded
        current_count = len(window)
        is_allowed = current_count < limit
        
        # Add current request timestamp if allowed
        if is_allowed:
            window.append(now)
        
        # Calculate rate limit info
        rate_limit_info = {
            "limit": limit,
            "remaining": max(0, limit - current_count - (1 if is_allowed else 0)),
            "reset": int(window_start + window_seconds) if window else int(now + window_seconds),
            "retry_after": int(window_seconds) if not is_allowed else 0
        }
        
        return is_allowed, rate_limit_info


# Global rate limiter instance
rate_limiter = SlidingWindowRateLimiter()


def parse_rate_limit(rate_string: str) -> Tuple[int, int]:
    """
    Parse rate limit string like '5/minute' into (count, seconds).
    
    Args:
        rate_string: Rate limit string (e.g., "5/minute", "100/hour")
        
    Returns:
        Tuple of (requests_count, time_window_seconds)
    """
    try:
        count_str, period = rate_string.split('/')
        count = int(count_str)
        
        period_map = {
            'second': 1,
            'minute': 60,
            'hour': 3600,
            'day': 86400
        }
        
        seconds = period_map.get(period.lower(), 60)  # Default to minute
        return count, seconds
    except (ValueError, KeyError):
        logger.warning(f"Invalid rate limit format: {rate_string}, using default 5/minute")
        return 5, 60


def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    
    Handles common proxy headers for production deployments.
    """
    # Check for forwarded IP (common in production behind load balancers)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, use the first one
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP (some proxies use this)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct client IP
    return request.client.host if request.client else "unknown"


def get_rate_limit_key(request: Request, identifier_type: str, user_id: Optional[str] = None) -> str:
    """
    Generate rate limit key based on identifier type.
    
    Args:
        request: FastAPI request object
        identifier_type: Type of identifier ("ip", "user", "ip_user")
        user_id: User ID for user-based rate limiting
        
    Returns:
        Rate limit key string
    """
    client_ip = get_client_ip(request)
    
    if identifier_type == "ip":
        return f"ip:{client_ip}"
    elif identifier_type == "user" and user_id:
        return f"user:{user_id}"
    elif identifier_type == "ip_user" and user_id:
        return f"ip_user:{client_ip}:{user_id}"
    else:
        # Fallback to IP-based limiting
        return f"ip:{client_ip}"


def check_rate_limit(
    request: Request, 
    rate_limit_string: str, 
    identifier_type: str = "ip",
    user_id: Optional[str] = None
) -> Tuple[bool, Dict[str, int]]:
    """
    Check if request is within rate limit.
    
    Args:
        request: FastAPI request object
        rate_limit_string: Rate limit string (e.g., "5/minute")
        identifier_type: Type of identifier ("ip", "user", "ip_user")
        user_id: User ID for user-based rate limiting
        
    Returns:
        Tuple of (is_allowed, rate_limit_headers)
    """
    # Parse rate limit
    limit, window_seconds = parse_rate_limit(rate_limit_string)
    
    # Generate rate limit key
    key = get_rate_limit_key(request, identifier_type, user_id)
    
    # Check rate limit
    is_allowed, rate_info = rate_limiter.is_allowed(key, limit, window_seconds)
    
    # Log rate limit events
    client_ip = get_client_ip(request)
    endpoint = f"{request.method} {request.url.path}"
    
    if not is_allowed:
        logger.warning(
            f"Rate limit exceeded for {identifier_type}: {key} | "
            f"Endpoint: {endpoint} | "
            f"IP: {client_ip} | "
            f"Limit: {limit}/{window_seconds}s"
        )
    else:
        logger.debug(
            f"Rate limit check passed for {identifier_type}: {key} | "
            f"Endpoint: {endpoint} | "
            f"Requests: {limit - rate_info['remaining']}/{limit}"
        )
    
    return is_allowed, rate_info 