from typing import Annotated, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from app.api.dependencies import get_current_active_user
from app.db.models import User
from app.db.session import get_db
from app.crud import pomodoro as crud
from app.schemas.pomodoro import (
    PomodoroPreferences,
    SessionStart,
    SessionComplete,
    SessionAbandon,
    SessionResponse
)

router = APIRouter()


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
    logger.info("Received preferences update request for user {}", current_user.id)
    logger.info("Current user preferences: {}", current_user.preferences)
    logger.info("New preferences data: {}", preferences.model_dump())
    
    # Convert to dict with exclude_unset=True to only include fields that were actually set
    preferences_dict = preferences.model_dump(exclude_unset=True)
    logger.info("Preferences dict after model_dump: {}", preferences_dict)
    
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
    
    logger.info("Updated user preferences: {}", user.preferences)
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
    start time.
    
    Args:
        session_in: The session data including type, durations, and optional learning project
        
    Returns:
        SessionResponse: The newly created session
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 422: If the request data is invalid
    """
    session = await crud.create_session(
        db=db,
        user_id=current_user.id,
        session_in=session_in
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


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    learning_project_id: Optional[UUID] = None,
    session_type: Optional[str] = Query(None, pattern="^(work|break)$"),
    status: Optional[str] = Query(None, pattern="^(in_progress|completed|abandoned)$")
) -> List[SessionResponse]:
    """List user's Pomodoro sessions with optional filters.
    
    Retrieves a paginated list of Pomodoro sessions for the current user, with
    optional filtering by learning project, session type, and status.
    
    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (for pagination)
        learning_project_id: Optional UUID to filter by learning project
        session_type: Optional filter for session type ("work" or "break")
        status: Optional filter for session status ("in_progress", "completed", "abandoned")
        
    Returns:
        List[SessionResponse]: List of matching sessions
        
    Raises:
        HTTPException: 
            - 401: If the user is not authenticated
            - 422: If any query parameters are invalid
    """
    sessions = await crud.get_user_sessions(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        learning_project_id=learning_project_id,
        session_type=session_type,
        status=status
    )
    return sessions 