from fastapi import APIRouter
from app.schemas.health import HealthCheck

router = APIRouter()


@router.get("/health", response_model=HealthCheck)
async def health_check() -> HealthCheck:
    """
    Public liveness check. Returns a fixed response when the API is reachable.
    No internal state (e.g. DB) is checked or exposed.
    """
    return HealthCheck(status=True, message="ok")
