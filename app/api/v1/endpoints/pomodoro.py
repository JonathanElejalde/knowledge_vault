from typing import Annotated, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from app.api.dependencies import get_current_active_user, general_rate_limit
from app.api.v1.endpoints.learning_projects import _map_project_to_response
from app.db.models import User
from app.db.session import get_db
from app.crud import pomodoro as crud
from app.schemas.pomodoro import (
    PomodoroPreferences,
    SessionStart,
    SessionComplete,
    SessionAbandon,
    SessionResponse,
    SessionResponseWithProject,
    SessionSummaryResponse,
    WeeklyStatisticsResponse
)
from app.schemas.learning_projects import LearningProjectResponse
from datetime import datetime, date

router = APIRouter(
    tags=["Pomodoro"],
    dependencies=[general_rate_limit]  # Apply rate limiting to all pomodoro endpoints
)


@router.get("/preferences", response_model=PomodoroPreferences)
async def get_pomodoro_preferences(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> PomodoroPreferences:
    """Get current user's Pomodoro preferences.
    
    Retrieves the current user's Pomodoro timer settings, including work duration,
    break duration, long break duration, and long break interval. If no preferences
    are set, returns default values.
    
    Returns:
        PomodoroPreferences: The user's Pomodoro timer settings
        
    Raises:
        HTTPException: If the user is not authenticated
    """
    preferences = current_user.preferences.get("pomodoro", {})
    return PomodoroPreferences(**preferences)


@router.put("/preferences", response_model=PomodoroPreferences)
async def update_pomodoro_preferences(
    preferences: PomodoroPreferences,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> PomodoroPreferences:
    """Update current user's Pomodoro preferences.
    
    Updates the user's Pomodoro timer settings. All fields are optional and will
    only update the specified values, leaving other preferences unchanged.
    
    Args:
        preferences: The new Pomodoro preferences to set
        
    Returns:
        PomodoroPreferences: The updated Pomodoro timer settings
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 404: If the user is not found
    """
    logger.info("Preferences update request for user {}", current_user.id)

    # Convert to dict with exclude_unset=True to only include fields that were actually set
    preferences_dict = preferences.model_dump(exclude_unset=True)

    user = await crud.update_user_preferences(
        db=db,
        user_id=current_user.id,
        preferences=preferences_dict
    )
    if not user:
        logger.error("User {} not found during preferences update", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info("Preferences updated for user {}", current_user.id)
    return PomodoroPreferences(**user.preferences.get("pomodoro", {}))


@router.post("/sessions/start", response_model=SessionResponse)
async def start_session(
    session_in: SessionStart,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> SessionResponse:
    """Start a new Pomodoro session.
    
    Creates a new Pomodoro session (work or break) for the current user. The session
    is created with an 'in_progress' status and the current UTC timestamp as the
    start time. Validates that the linked learning project (if any) belongs to the
    user and is not archived.
    
    Args:
        session_in: The session data including type, durations, and optional learning project
        
    Returns:
        SessionResponse: The newly created session
        
    Raises:
        HTTPException: 
            - 400: If the learning project doesn't exist, is archived, or doesn't belong to the user
            - 401: If the user is not authenticated
            - 422: If the request data is invalid
    """
    session = await crud.create_session(
        db=db,
        user_id=current_user.id,
        session_in=session_in
    )
    if not session:
        # This occurs if the learning project is archived or doesn't belong to the user
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create session: the specified learning project does not exist, is archived, or does not belong to you."
        )
    return session


@router.post("/sessions/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: UUID,
    session_in: SessionComplete,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> SessionResponse:
    """Complete a Pomodoro session.
    
    Marks a Pomodoro session as completed by setting its end time to the current UTC
    timestamp and updating its status. Optionally updates the actual duration if it
    differs from the planned duration.
    
    Args:
        session_id: The UUID of the session to complete
        session_in: Optional data including the actual duration
        
    Returns:
        SessionResponse: The updated session
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 404: If the session is not found or doesn't belong to the user
            - 422: If the request data is invalid
    """
    session = await crud.complete_session(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        session_in=session_in
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return session


@router.post("/sessions/{session_id}/abandon", response_model=SessionResponse)
async def abandon_session(
    session_id: UUID,
    session_in: SessionAbandon,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> SessionResponse:
    """Abandon a Pomodoro session.
    
    Marks a Pomodoro session as abandoned (interrupted) by setting its end time to
    the current UTC timestamp and updating its status. Optionally records the actual
    duration and reason for abandonment in the session's metadata.
    
    Args:
        session_id: The UUID of the session to abandon
        session_in: Optional data including actual duration and abandonment reason
        
    Returns:
        SessionResponse: The updated session
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 404: If the session is not found or doesn't belong to the user
            - 422: If the request data is invalid
    """
    session = await crud.abandon_session(
        db=db,
        session_id=session_id,
        user_id=current_user.id,
        session_in=session_in
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    return session


@router.get("/sessions", response_model=List[SessionResponseWithProject])
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    learning_project_id: Optional[UUID] = None,
    session_type: Optional[str] = Query(None, pattern="^(work|break)$"),
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(in_progress|completed|abandoned)$")
) -> List[SessionResponseWithProject]:
    """List user's Pomodoro sessions with optional filters.
    
    Retrieves a paginated list of Pomodoro sessions for the current user, with
    optional filtering by learning project, session type, and status.
    Includes learning project details if available.
    
    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (for pagination)
        learning_project_id: Optional UUID to filter by learning project
        session_type: Optional filter for session type ("work" or "break")
        status_filter: Optional filter for session status ("in_progress", "completed", "abandoned")
        
    Returns:
        List[SessionResponseWithProject]: List of matching sessions with project details
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 422: If any query parameters are invalid
    """
    sessions_db = await crud.get_user_sessions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        learning_project_id=learning_project_id,
        session_type=session_type,
        status=status_filter
    )
    response_list = []
    for session_db in sessions_db:
        project_response_data = None
        if session_db.learning_project:
            if session_db.learning_project.status == "archived":
                continue
            project_response_data = LearningProjectResponse.model_validate(
                _map_project_to_response(session_db.learning_project)
            )
        
        session_data = SessionResponse.model_validate(session_db).model_dump()
        response_list.append(SessionResponseWithProject(**session_data, learning_project=project_response_data))
    return response_list


@router.get("/statistics/weekly", response_model=WeeklyStatisticsResponse)
async def get_weekly_statistics(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> WeeklyStatisticsResponse:
    """Get weekly Pomodoro statistics for the current user.
    
    Retrieves comprehensive statistics for the current calendar week (Monday to Sunday)
    including total focus time, session counts, and notes taken. This endpoint provides
    key metrics for dashboard display and user progress tracking.
    
    Returns:
        WeeklyStatisticsResponse: Weekly statistics including:
            - total_focus_time_minutes: Sum of actual_duration (or work_duration) for completed and abandoned sessions
            - completed_sessions_count: Number of sessions marked as completed
            - abandoned_sessions_count: Number of sessions marked as abandoned  
            - notes_count: Total number of notes created during the week
            - week_start_date: Start of the current week (Monday at 00:00:00)
            - week_end_date: End of the current week (Sunday at 23:59:59)
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            
    Note:
        - Uses calendar week (Monday-Sunday) for consistent reporting
        - Only includes data from non-archived learning projects
        - Focus time calculation prioritizes actual_duration over planned work_duration
        - Notes are counted from both session-linked and project-linked notes
    """
    return await crud.get_weekly_statistics(
        db=db,
        user_id=current_user.id
    )


@router.get("/sessions/summary", response_model=List[SessionSummaryResponse])
async def get_session_summaries(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    period: str = Query("week", pattern="^(week|month)$", description="Time period to summarize"),
    start_date: Optional[datetime] = Query(None, description="Start date for custom date range (ISO 8601)"),
    end_date: Optional[datetime] = Query(None, description="End date for custom date range (ISO 8601)"),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of project summaries to return")
) -> List[SessionSummaryResponse]:
    """Get summaries of Pomodoro sessions grouped by project.
    
    Retrieves summaries of completed Pomodoro sessions for the current user,
    grouped by learning project. Each summary includes total duration, session count,
    and date range of activity.
    
    Args:
        period: Time period to summarize ("week" or "month")
        start_date: Optional start date for custom date range
        end_date: Optional end date for custom date range
        limit: Maximum number of project summaries to return
        
    Returns:
        List[SessionSummaryResponse]: List of project summaries
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 422: If any query parameters are invalid
            
    Note:
        - If period is "week", returns data for the current week (Monday-Sunday)
        - If period is "month", returns data for the current month
        - If start_date and end_date are provided, uses that range instead
        - Only includes completed sessions
        - Uses actual_duration if available, otherwise work_duration
        - Sessions without a project are grouped under "No Project"
    """
    return await crud.get_session_summaries(
        db=db,
        user_id=current_user.id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        limit=limit
    )

