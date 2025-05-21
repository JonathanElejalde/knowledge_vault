from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, check_db_connection
from app.schemas.health import HealthCheck

router = APIRouter()

@router.get("/health", response_model=HealthCheck)
async def health_check(db: AsyncSession = Depends(get_db)) -> HealthCheck:
    """
    Health check endpoint that verifies database connectivity.
    Returns the health status of the application.
    """
    db_status = await check_db_connection()
    
    return HealthCheck(
        status=db_status,
        message="Database connection is healthy" if db_status else "Database connection failed"
    ) 