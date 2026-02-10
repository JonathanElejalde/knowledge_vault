from datetime import datetime, UTC, timedelta
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_, func, case
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger
from app.db.models import Session, User, LearningProject, Note
from app.schemas.pomodoro import SessionStart, SessionComplete, SessionAbandon, SessionSummaryResponse, WeeklyStatisticsResponse
from app.crud.learning_projects import validate_project_ownership


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
    existing_session_result = await db.execute(
        select(Session)
        .where(
            and_(
                Session.user_id == user_id,
                Session.status == "in_progress"
            )
        )
        .order_by(Session.start_time.desc())
        .limit(1)
    )
    existing_session = existing_session_result.scalars().first()
    if existing_session:
        logger.info(
            f"User {user_id} attempted to start a new session while session "
            f"{existing_session.id} is already in progress. Returning existing session."
        )
        return existing_session

    if session_in.learning_project_id:
        # Validate project ownership and ensure it's not archived
        project = await validate_project_ownership(
            db, session_in.learning_project_id, user_id, allow_archived=False
        )
        if not project:
            logger.warning(
                f"User {user_id} attempted to create session for project "
                f"{session_in.learning_project_id} they don't own or is archived. Denying creation."
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
    try:
        await db.commit()
        await db.refresh(session)
        return session
    except IntegrityError:
        await db.rollback()
        # Handle race conditions where another request created an in-progress session first.
        conflict_result = await db.execute(
            select(Session)
            .where(
                and_(
                    Session.user_id == user_id,
                    Session.status == "in_progress"
                )
            )
            .order_by(Session.start_time.desc())
            .limit(1)
        )
        conflict_session = conflict_result.scalars().first()
        if conflict_session:
            return conflict_session
        raise


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
    Eagerly loads the associated learning project and its category.
    
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
        .options(selectinload(Session.learning_project).selectinload(LearningProject.category))
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
    
    # Commit the changes
    await db.commit()
    
    # Refresh to verify the changes were saved
    await db.refresh(user)
    return user


async def get_session_summaries(
    db: AsyncSession,
    user_id: UUID,
    period: str = "week",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10
) -> List[SessionSummaryResponse]:
    """Get summaries of Pomodoro sessions grouped by project.
    
    Retrieves summaries of completed Pomodoro sessions for the specified user,
    grouped by learning project. Each summary includes total duration, session count,
    and date range of activity.
    
    Args:
        db: The database session to use for the operation
        user_id: The UUID of the user whose sessions to summarize
        period: Time period to summarize ("week" or "month")
        start_date: Optional start date for custom date range
        end_date: Optional end date for custom date range
        limit: Maximum number of project summaries to return
        
    Returns:
        List[SessionSummaryResponse]: List of project summaries
        
    Note:
        - If period is "week", returns data for the current week (Monday-Sunday)
        - If period is "month", returns data for the current month
        - If start_date and end_date are provided, uses that range instead
        - Only includes completed and abandoned sessions
        - Only includes sessions from completed or in_progress learning projects
        - Excludes sessions without a project linked
        - Uses actual_duration if available, otherwise work_duration
    """
    # Build the base query
    query = (
        select(
            Session.learning_project_id.label("project_id"),
            LearningProject.name.label("project_name"),
            func.sum(
                case(
                    (Session.actual_duration.isnot(None), Session.actual_duration),
                    else_=Session.work_duration
                )
            ).label("total_duration_minutes"),
            func.min(Session.start_time).label("first_session_date"),
            func.max(Session.start_time).label("last_session_date"),
            func.count(Session.id).label("session_count")
        )
        .join(LearningProject, Session.learning_project_id == LearningProject.id)
        .where(
            and_(
                Session.user_id == user_id,
                Session.status.in_(["completed", "abandoned"]),  # Include both completed and abandoned sessions
                Session.learning_project_id.isnot(None),  # Must have a project linked
                LearningProject.status.in_(["completed", "in_progress"])  # Only active projects
            )
        )
        .group_by(Session.learning_project_id, LearningProject.name)
    )
    
    # Handle date filtering
    now = datetime.now(UTC)
    if start_date and end_date:
        query = query.where(
            and_(
                Session.start_time >= start_date,
                Session.start_time <= end_date
            )
        )
    elif period == "week":
        # Get start of current week (Monday)
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        # Get end of current week (Sunday)
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
        query = query.where(
            and_(
                Session.start_time >= start_of_week,
                Session.start_time <= end_of_week
            )
        )
    elif period == "month":
        # Get start of current month
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Get end of current month
        if now.month == 12:
            end_of_month = now.replace(year=now.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            end_of_month = now.replace(month=now.month + 1, day=1) - timedelta(days=1)
        end_of_month = end_of_month.replace(hour=23, minute=59, second=59, microsecond=999999)
        query = query.where(
            and_(
                Session.start_time >= start_of_month,
                Session.start_time <= end_of_month
            )
        )
    
    # Order by most recent activity and limit results
    query = query.order_by(func.max(Session.start_time).desc()).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    summaries = result.all()
    
    # Convert to response model
    return [
        SessionSummaryResponse(
            project_id=summary.project_id,
            project_name=summary.project_name,
            total_duration_minutes=summary.total_duration_minutes or 0,
            first_session_date=summary.first_session_date,
            last_session_date=summary.last_session_date,
            session_count=summary.session_count
        )
        for summary in summaries
    ]


async def get_weekly_statistics(
    db: AsyncSession,
    user_id: UUID
) -> WeeklyStatisticsResponse:
    """Get weekly statistics for a user's Pomodoro sessions and notes.
    
    Retrieves statistics for the current calendar week (Monday to Sunday) including:
    - Total focus time from completed and abandoned sessions
    - Count of completed sessions
    - Count of abandoned sessions  
    - Count of notes taken
    
    Args:
        db: The database session to use for the operation
        user_id: The UUID of the user whose statistics to retrieve
        
    Returns:
        WeeklyStatisticsResponse: Weekly statistics for the user
        
    Note:
        - Uses calendar week (Monday-Sunday) for consistent reporting
        - Focus time includes actual_duration if available, otherwise work_duration
        - Only includes sessions from completed or in_progress learning projects
        - Excludes sessions and notes without a project linked
        - Notes are counted from user's notes in active projects during the current week
    """
    now = datetime.now(UTC)
    
    # Calculate start of current week (Monday)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate end of current week (Sunday)
    end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    # Query for session statistics
    session_stats_query = (
        select(
            func.sum(
                case(
                    (Session.actual_duration.isnot(None), Session.actual_duration),
                    else_=Session.work_duration
                )
            ).label("total_focus_time"),
            func.sum(
                case(
                    (Session.status == "completed", 1),
                    else_=0
                )
            ).label("completed_count"),
            func.sum(
                case(
                    (Session.status == "abandoned", 1),
                    else_=0
                )
            ).label("abandoned_count")
        )
        .join(LearningProject, Session.learning_project_id == LearningProject.id)
        .where(
            and_(
                Session.user_id == user_id,
                Session.start_time >= start_of_week,
                Session.start_time <= end_of_week,
                Session.status.in_(["completed", "abandoned"]),  # Only count completed and abandoned sessions for focus time
                Session.learning_project_id.isnot(None),  # Must have a project linked
                LearningProject.status.in_(["completed", "in_progress"])  # Only active projects
            )
        )
    )
    
    # Query for notes count - simplified to only count notes from user's active projects
    notes_count_query = (
        select(func.count(Note.id))
        .join(LearningProject, Note.learning_project_id == LearningProject.id)
        .where(
            and_(
                Note.user_id == user_id,  # Notes belong to this user
                Note.created_at >= start_of_week,
                Note.created_at <= end_of_week,
                Note.learning_project_id.isnot(None),  # Must have a project linked
                LearningProject.status.in_(["completed", "in_progress"])  # Only active projects
            )
        )
    )
    
    # Execute queries
    session_stats_result = await db.execute(session_stats_query)
    session_stats = session_stats_result.first()
    
    notes_count_result = await db.execute(notes_count_query)
    notes_count = notes_count_result.scalar() or 0
    
    # Extract values with defaults
    total_focus_time = session_stats.total_focus_time or 0
    completed_count = session_stats.completed_count or 0
    abandoned_count = session_stats.abandoned_count or 0
    
    return WeeklyStatisticsResponse(
        total_focus_time_minutes=total_focus_time,
        completed_sessions_count=completed_count,
        abandoned_sessions_count=abandoned_count,
        notes_count=notes_count,
        week_start_date=start_of_week,
        week_end_date=end_of_week
    )
