from datetime import datetime, UTC
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger
from app.db.models import Session, User, LearningProject
from app.schemas.pomodoro import SessionStart, SessionComplete, SessionAbandon


async def create_session(
    db: AsyncSession,
    user_id: UUID,
    session_in: SessionStart
) -> Optional[Session]:
    """Create a new Pomodoro session.
    
    This function creates a new Pomodoro session (work or break) for the specified user.
    The session is created with an 'in_progress' status and the current UTC timestamp
    as the start time.
    If a learning_project_id is provided, it checks if the project is archived.
    If the project is archived, session creation is prevented.
    
    Args:
        db: The database session to use for the operation
        user_id: The UUID of the user creating the session
        session_in: The session data including type, durations, and optional learning project
        
    Returns:
        Optional[Session]: The newly created session object, or None if the associated learning project is archived.
        
    Note:
        The session is automatically committed to the database and refreshed
        to include any database-generated values.
    """
    if session_in.learning_project_id:
        # Check if the learning project is archived
        project_result = await db.execute(
            select(LearningProject).where(LearningProject.id == session_in.learning_project_id)
        )
        project = project_result.scalars().first()
        if project and project.status == "archived":
            logger.warning(
                f"User {user_id} attempt to create session for archived learning project "
                f"{session_in.learning_project_id}. Denying creation."
            )
            return None

    session = Session(
        user_id=user_id,
        learning_project_id=session_in.learning_project_id,
        title=session_in.title,
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
        select(Session)
        .where(and_(Session.id == session_id, Session.user_id == user_id))
        .options(selectinload(Session.learning_project))  # Eager load learning_project
    )
    session = result.scalars().first()

    # Do not return session if its learning project is archived
    if session and session.learning_project and session.learning_project.status == "archived":
        logger.warning(
            f"Attempt to access session {session_id} whose learning project "
            f"{session.learning_project_id} is archived. Denying access."
        )
        return None

    return session


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
        # get_session now handles logging if project is archived, so just return None
        return None
    
    # Additional check specifically for complete_session, although get_session should cover it.
    # This is more for explicitnes within this function's context if get_session's behavior changes.
    if session.learning_project and session.learning_project.status == "archived":
        logger.warning(
            f"Attempt to complete session {session_id} for archived learning project "
            f"{session.learning_project_id}. Operation denied."
        )
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
        # get_session now handles logging if project is archived, so just return None
        return None

    # Additional check for abandon_session
    if session.learning_project and session.learning_project.status == "archived":
        logger.warning(
            f"Attempt to abandon session {session_id} for archived learning project "
            f"{session.learning_project_id}. Operation denied."
        )
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
    query = (
        select(Session)
        .where(Session.user_id == user_id)
        .options(selectinload(Session.learning_project))
    )
    
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

