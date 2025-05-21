from datetime import datetime, UTC
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger
from app.db.models import Session, User
from app.schemas.pomodoro import SessionStart, SessionComplete, SessionAbandon


async def create_session(
    db: AsyncSession,
    user_id: UUID,
    session_in: SessionStart
) -> Session:
    """Create a new Pomodoro session.
    
    This function creates a new Pomodoro session (work or break) for the specified user.
    The session is created with an 'in_progress' status and the current UTC timestamp
    as the start time.
    
    Args:
        db: The database session to use for the operation
        user_id: The UUID of the user creating the session
        session_in: The session data including type, durations, and optional learning project
        
    Returns:
        Session: The newly created session object
        
    Note:
        The session is automatically committed to the database and refreshed
        to include any database-generated values.
    """
    session = Session(
        user_id=user_id,
        learning_project_id=session_in.learning_project_id,
        start_time=datetime.now(UTC),
        work_duration=session_in.work_duration,
        break_duration=session_in.break_duration,
        session_type=session_in.session_type,
        status="in_progress"
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(
    db: AsyncSession,
    session_id: UUID,
    user_id: UUID
) -> Optional[Session]:
    """Get a specific Pomodoro session.
    
    Retrieves a Pomodoro session by its ID, ensuring it belongs to the specified user.
    This is a security measure to prevent users from accessing other users' sessions.
    
    Args:
        db: The database session to use for the operation
        session_id: The UUID of the session to retrieve
        user_id: The UUID of the user who owns the session
        
    Returns:
        Optional[Session]: The session if found, None otherwise
    """
    result = await db.execute(
        select(Session).where(
            and_(
                Session.id == session_id,
                Session.user_id == user_id
            )
        )
    )
    return result.scalars().first()


async def complete_session(
    db: AsyncSession,
    session_id: UUID,
    user_id: UUID,
    session_in: SessionComplete
) -> Optional[Session]:
    """Complete a Pomodoro session.
    
    Marks a Pomodoro session as completed by setting its end time to the current UTC
    timestamp and updating its status. Optionally updates the actual duration if it
    differs from the planned duration.
    
    Args:
        db: The database session to use for the operation
        session_id: The UUID of the session to complete
        user_id: The UUID of the user who owns the session
        session_in: Optional data including the actual duration
        
    Returns:
        Optional[Session]: The updated session if found, None otherwise
        
    Note:
        The session must exist and belong to the specified user.
        The actual duration is only updated if provided in session_in.
    """
    session = await get_session(db, session_id, user_id)
    if not session:
        return None
    
    session.end_time = datetime.now(UTC)
    session.status = "completed"
    if session_in.actual_duration:
        session.actual_duration = session_in.actual_duration
    
    await db.commit()
    await db.refresh(session)
    return session


async def abandon_session(
    db: AsyncSession,
    session_id: UUID,
    user_id: UUID,
    session_in: SessionAbandon
) -> Optional[Session]:
    """Abandon a Pomodoro session.
    
    Marks a Pomodoro session as abandoned (interrupted) by setting its end time to
    the current UTC timestamp and updating its status. Optionally records the actual
    duration and reason for abandonment in the session's metadata.
    
    Args:
        db: The database session to use for the operation
        session_id: The UUID of the session to abandon
        user_id: The UUID of the user who owns the session
        session_in: Optional data including actual duration and abandonment reason
        
    Returns:
        Optional[Session]: The updated session if found, None otherwise
        
    Note:
        The session must exist and belong to the specified user.
        The actual duration and reason are only recorded if provided in session_in.
    """
    session = await get_session(db, session_id, user_id)
    if not session:
        return None
    
    session.end_time = datetime.now(UTC)
    session.status = "abandoned"
    if session_in.actual_duration:
        session.actual_duration = session_in.actual_duration
    if session_in.reason:
        session.meta_data["abandon_reason"] = session_in.reason
    
    await db.commit()
    await db.refresh(session)
    return session


async def get_user_sessions(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    learning_project_id: Optional[UUID] = None,
    session_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[Session]:
    """Get a list of user's Pomodoro sessions with optional filters.
    
    Retrieves a paginated list of Pomodoro sessions for the specified user,
    with optional filtering by learning project, session type, and status.
    
    Args:
        db: The database session to use for the operation
        user_id: The UUID of the user whose sessions to retrieve
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return (for pagination)
        learning_project_id: Optional UUID to filter by learning project
        session_type: Optional filter for session type ("work" or "break")
        status: Optional filter for session status ("in_progress", "completed", "abandoned")
        
    Returns:
        List[Session]: List of matching sessions
        
    Note:
        The skip and limit parameters enable pagination of results.
        All filters are optional and can be combined.
    """
    query = select(Session).where(Session.user_id == user_id)
    
    if learning_project_id:
        query = query.where(Session.learning_project_id == learning_project_id)
    if session_type:
        query = query.where(Session.session_type == session_type)
    if status:
        query = query.where(Session.status == status)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_user_preferences(
    db: AsyncSession,
    user_id: UUID,
    preferences: dict
) -> Optional[User]:
    """Update user's Pomodoro preferences.
    
    Updates the Pomodoro-related preferences in the user's preferences JSONB field.
    If the 'pomodoro' key doesn't exist in the preferences, it will be created.
    Only updates the fields that were actually set in the request.
    
    Args:
        db: The database session to use for the operation
        user_id: The UUID of the user whose preferences to update
        preferences: Dictionary of Pomodoro preferences to update
        
    Returns:
        Optional[User]: The updated user object if found, None otherwise
        
    Note:
        This function only updates the fields that were explicitly set in the request,
        leaving other preference sections and fields unchanged.
    """
    # Use select with for_update to lock the row during update
    stmt = (
        select(User)
        .where(User.id == user_id)
        .with_for_update()
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        logger.error("User {} not found in database", user_id)
        return None
    
    # Initialize preferences if they don't exist
    if not user.preferences:
        user.preferences = {}
    
    # Initialize pomodoro preferences if they don't exist
    if "pomodoro" not in user.preferences:
        user.preferences["pomodoro"] = {}
    
    # Create a deep copy of the current preferences to force SQLAlchemy to detect the change
    current_preferences = dict(user.preferences)
    
    # Update the pomodoro preferences
    current_preferences["pomodoro"] = preferences
    
    # Assign the updated dictionary back to force SQLAlchemy to detect the change
    user.preferences = current_preferences
    
    # Update the updated_at timestamp
    user.updated_at = datetime.now(UTC)
    
    # Commit the changes
    await db.commit()
    
    # Refresh to verify the changes were saved
    await db.refresh(user)
    return user 