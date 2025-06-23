from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user, general_rate_limit
from app.db.models import User
from app.db.session import get_db
from app.crud import dashboard as crud_dashboard
from app.schemas.dashboard import (
    DashboardStatsResponse,
    ProjectStatsResponse,
    DailyActivityResponse,
    SessionTimeResponse,
    DashboardResponse
)

router = APIRouter(
    tags=["Dashboard"],
    dependencies=[general_rate_limit]  # Apply rate limiting to all dashboard endpoints
)

# Valid period options
VALID_PERIODS = ['7d', '2w', '4w', '3m', '1y', 'all']


def validate_period(period: str) -> str:
    """Validate the period parameter."""
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period. Must be one of: {', '.join(VALID_PERIODS)}"
        )
    return period


def get_user_timezone(x_timezone: str = Header(None)) -> str:
    """Extract user timezone from headers.
    
    Args:
        x_timezone: Timezone from X-Timezone header (e.g., "America/Bogota")
        
    Returns:
        User's timezone string or UTC as fallback
    """
    return x_timezone or "UTC"


@router.get("/", response_model=DashboardResponse)
async def get_dashboard(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(
        default='7d',
        description="Time period for dashboard data",
        regex='^(7d|2w|4w|3m|1y|all)$'
    ),
    user_timezone: str = Depends(get_user_timezone)
) -> DashboardResponse:
    """Get complete dashboard data for the current user.

    Args:
        current_user: The authenticated user.
        db: The database session.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        user_timezone: User's timezone for server-side date calculations.

    Returns:
        Complete dashboard data including stats, project stats, and chart data.
    """
    validated_period = validate_period(period)
    
    dashboard_data = await crud_dashboard.get_dashboard_data(
        db=db, user_id=current_user.id, period=validated_period, user_timezone=user_timezone
    )
    
    return dashboard_data


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(
        default='7d',
        description="Time period for dashboard statistics",
        regex='^(7d|2w|4w|3m|1y|all)$'
    )
) -> DashboardStatsResponse:
    """Get dashboard statistics for the current user.

    Args:
        current_user: The authenticated user.
        db: The database session.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').

    Returns:
        Dashboard statistics including focus time, notes created, and project counts.
    """
    validated_period = validate_period(period)
    
    stats = await crud_dashboard.get_dashboard_stats(
        db=db, user_id=current_user.id, period=validated_period
    )
    
    return stats


@router.get("/projects", response_model=List[ProjectStatsResponse])
async def get_project_stats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(
        default='7d',
        description="Time period for project statistics",
        regex='^(7d|2w|4w|3m|1y|all)$'
    )
) -> List[ProjectStatsResponse]:
    """Get project statistics for the current user.

    Args:
        current_user: The authenticated user.
        db: The database session.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').

    Returns:
        List of project statistics showing sessions and notes count per project.
    """
    validated_period = validate_period(period)
    
    project_stats = await crud_dashboard.get_project_stats(
        db=db, user_id=current_user.id, period=validated_period
    )
    
    return project_stats


@router.get("/activity", response_model=List[DailyActivityResponse])
async def get_daily_activity(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(
        default='7d',
        description="Time period for daily activity data",
        regex='^(7d|2w|4w|3m|1y|all)$'
    ),
    user_timezone: str = Depends(get_user_timezone)
) -> List[DailyActivityResponse]:
    """Get daily activity chart data for the current user.

    Args:
        current_user: The authenticated user.
        db: The database session.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        user_timezone: User's timezone for accurate date grouping.

    Returns:
        List of daily activity data grouped by user's local timezone.
    """
    validated_period = validate_period(period)
    
    daily_activity = await crud_dashboard.get_daily_activity(
        db=db, user_id=current_user.id, period=validated_period, user_timezone=user_timezone
    )
    
    return daily_activity


@router.get("/session-times", response_model=List[SessionTimeResponse])
async def get_session_times(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query(
        default='7d',
        description="Time period for session times data",
        regex='^(7d|2w|4w|3m|1y|all)$'
    )
) -> List[SessionTimeResponse]:
    """Get session times chart data for the current user.

    Args:
        current_user: The authenticated user.
        db: The database session.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').

    Returns:
        List of session times data showing when sessions occurred with their duration.
    """
    validated_period = validate_period(period)
    
    session_times = await crud_dashboard.get_session_times(
        db=db, user_id=current_user.id, period=validated_period
    )
    
    return session_times 