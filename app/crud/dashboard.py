from datetime import datetime, timedelta, date as date_type, UTC
from typing import List, Tuple, Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select, func, and_, case, text, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from dateutil.relativedelta import relativedelta
from loguru import logger

from app.db.models import Session, Note, LearningProject, User
from app.schemas.dashboard import (
    DashboardStatsResponse,
    ProjectStatsResponse,
    DailyActivityResponse,
    SessionTimeResponse,
    FocusHeatmapCell,
    FocusHeatmapResponse,
    DashboardResponse
)


def _safe_timezone_expr(column_expr: str, timezone: str) -> text:
    """Safely construct PostgreSQL AT TIME ZONE expression.
    
    IMPORTANT: The timezone parameter MUST be validated against IANA timezone
    database before calling this function. This function assumes the timezone
    is already validated and safe to use in SQL.
    
    Args:
        column_expr: Column expression (e.g., "created_at", "start_time")
        timezone: Validated IANA timezone name (e.g., "America/New_York")
        
    Returns:
        SQLAlchemy text() expression for AT TIME ZONE conversion
    """
    # Escape single quotes in timezone name (defense in depth, though
    # validated IANA timezones shouldn't contain quotes)
    escaped_timezone = timezone.replace("'", "''")
    return text(f"{column_expr} AT TIME ZONE '{escaped_timezone}'")


def _get_date_range(period: str) -> Tuple[datetime, datetime]:
    """Get the date range based on the period selection (UTC-based).
    
    Used for filtering database queries. For user-facing date ranges,
    use _get_local_date_range instead.
    
    Args:
        period: One of '7d', '2w', '4w', '3m', '1y', 'all'
        
    Returns:
        Tuple of (start_date, end_date) in UTC
    """
    now = datetime.now(UTC)
    
    if period == '7d':
        start_date = now - timedelta(days=7)
    elif period == '2w':
        start_date = now - timedelta(weeks=2)
    elif period == '4w':
        start_date = now - timedelta(weeks=4)
    elif period == '3m':
        start_date = now - timedelta(days=90)
    elif period == '1y':
        start_date = now - timedelta(days=365)
    elif period == 'all':
        start_date = datetime.min.replace(tzinfo=UTC)  # Make timezone-aware
    else:
        # Default to 7 days if invalid period
        start_date = now - timedelta(days=7)
    
    return start_date, now


def _get_local_date_range(period: str, user_timezone: str) -> Tuple[date_type, date_type]:
    """Get the date range in user's local timezone.
    
    Calculates the date range relative to the user's local "today".
    
    Args:
        period: One of '7d', '2w', '4w', '3m', '1y', 'all'
        user_timezone: User's timezone string (e.g., 'America/New_York')
        
    Returns:
        Tuple of (start_date, end_date) as date objects in user's local timezone.
        For 'all' period, returns (None, today) - caller must determine start.
    """
    tz = ZoneInfo(user_timezone)
    today = datetime.now(tz).date()
    
    if period == '7d':
        start_date = today - timedelta(days=6)
    elif period == '2w':
        start_date = today - timedelta(days=13)
    elif period == '4w':
        start_date = today - timedelta(days=27)
    elif period == '3m':
        start_date = today - relativedelta(months=3) + timedelta(days=1)
    elif period == '1y':
        start_date = today - relativedelta(years=1) + timedelta(days=1)
    elif period == 'all':
        # For 'all', return None as start - caller must find earliest activity
        return None, today
    else:
        # Default to 7 days if invalid period
        start_date = today - timedelta(days=6)
    
    return start_date, today


def _generate_date_range(start_date: date_type, end_date: date_type) -> List[date_type]:
    """Generate a list of all dates from start_date to end_date inclusive.
    
    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        
    Returns:
        List of date objects in ascending order
    """
    dates = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        current += timedelta(days=1)
    return dates


async def get_dashboard_stats(
    db: AsyncSession, user_id: UUID, period: str = '7d'
) -> DashboardStatsResponse:
    """Get dashboard statistics for the specified period.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        
    Returns:
        Dashboard statistics.
    """
    start_date, end_date = _get_date_range(period)
    
    # Build base conditions
    session_conditions = [Session.user_id == user_id]
    note_conditions = [Note.user_id == user_id]
    project_conditions = [LearningProject.user_id == user_id]
    
    if period != 'all':
        session_conditions.append(Session.created_at >= start_date)
        note_conditions.append(Note.created_at >= start_date)
        project_conditions.append(LearningProject.created_at >= start_date)
    
    # Get total focus time (sum of actual_duration)
    focus_time_result = await db.execute(
        select(func.coalesce(func.sum(Session.actual_duration), 0))
        .where(and_(*session_conditions))
    )
    total_focus_time = focus_time_result.scalar() or 0
    
    # Get notes created count
    notes_count_result = await db.execute(
        select(func.count(Note.id))
        .where(and_(*note_conditions))
    )
    notes_created = notes_count_result.scalar() or 0
    
    # Get active projects count
    active_projects_result = await db.execute(
        select(func.count(LearningProject.id))
        .where(and_(
            LearningProject.user_id == user_id,
            LearningProject.status == 'in_progress'
        ))
    )
    active_projects = active_projects_result.scalar() or 0
    
    # Get completed projects count
    completed_projects_result = await db.execute(
        select(func.count(LearningProject.id))
        .where(and_(
            LearningProject.user_id == user_id,
            LearningProject.status == 'completed'
        ))
    )
    completed_projects = completed_projects_result.scalar() or 0
    
    return DashboardStatsResponse(
        total_focus_time=total_focus_time,
        notes_created=notes_created,
        active_projects=active_projects,
        completed_projects=completed_projects
    )


async def get_project_stats(
    db: AsyncSession, user_id: UUID, period: str = '7d'
) -> List[ProjectStatsResponse]:
    """Get statistics by project for the specified period.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        
    Returns:
        List of project statistics.
    """
    start_date, end_date = _get_date_range(period)
    
    # Build subqueries for sessions and notes counts
    session_conditions = [Session.user_id == user_id]
    note_conditions = [Note.user_id == user_id]
    
    if period != 'all':
        session_conditions.append(Session.created_at >= start_date)
        note_conditions.append(Note.created_at >= start_date)
    
    # Subquery for session counts by project
    sessions_subq = (
        select(
            Session.learning_project_id,
            func.count(Session.id).label('sessions_count')
        )
        .where(and_(*session_conditions))
        .group_by(Session.learning_project_id)
        .subquery()
    )
    
    # Subquery for notes counts by project
    notes_subq = (
        select(
            Note.learning_project_id,
            func.count(Note.id).label('notes_count')
        )
        .where(and_(*note_conditions))
        .group_by(Note.learning_project_id)
        .subquery()
    )
    
    # Main query joining projects with counts
    query = (
        select(
            LearningProject.id,
            LearningProject.name,
            func.coalesce(sessions_subq.c.sessions_count, 0).label('sessions_count'),
            func.coalesce(notes_subq.c.notes_count, 0).label('notes_count')
        )
        .select_from(LearningProject)
        .outerjoin(sessions_subq, LearningProject.id == sessions_subq.c.learning_project_id)
        .outerjoin(notes_subq, LearningProject.id == notes_subq.c.learning_project_id)
        .where(LearningProject.user_id == user_id)
        .order_by(LearningProject.name)
    )
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    return [
        ProjectStatsResponse(
            project_id=row.id,
            project_name=row.name,
            sessions_count=row.sessions_count,
            notes_count=row.notes_count
        )
        for row in rows
        if row.sessions_count > 0 or row.notes_count > 0  # Only include projects with activity
    ]


async def _get_earliest_activity_date(
    db: AsyncSession, user_id: UUID, user_timezone: str
) -> Optional[date_type]:
    """Get the earliest activity date for a user in their local timezone.
    
    Checks both sessions and notes to find the earliest created_at date.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        user_timezone: User's timezone for date conversion.
        
    Returns:
        The earliest activity date in user's local timezone, or None if no activity.
    """
    # Get earliest session date
    # Note: user_timezone is validated at endpoint level before reaching here
    timezone_expr = _safe_timezone_expr("created_at", user_timezone)
    earliest_session_query = (
        select(
            func.min(func.date(timezone_expr))
        )
        .where(Session.user_id == user_id)
    )
    
    # Get earliest note date
    earliest_note_query = (
        select(
            func.min(func.date(timezone_expr))
        )
        .where(Note.user_id == user_id)
    )
    
    session_result = await db.execute(earliest_session_query)
    note_result = await db.execute(earliest_note_query)
    
    earliest_session = session_result.scalar()
    earliest_note = note_result.scalar()
    
    if earliest_session is None and earliest_note is None:
        return None
    if earliest_session is None:
        return earliest_note
    if earliest_note is None:
        return earliest_session
    
    return min(earliest_session, earliest_note)


async def get_daily_activity(
    db: AsyncSession, user_id: UUID, period: str = '7d', user_timezone: str = 'UTC'
) -> List[DailyActivityResponse]:
    """Get daily activity chart data grouped by user's local timezone.
    
    Returns all dates in the requested period, including dates with zero activity.
    Dates are calculated relative to the user's local "today".
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        user_timezone: User's timezone (e.g., 'America/Bogota', 'UTC').
        
    Returns:
        List of daily activity data for all dates in the range, sorted ascending.
    """
    # Get local date range based on user's timezone
    start_date, end_date = _get_local_date_range(period, user_timezone)
    
    # For 'all' period, find the earliest activity date
    if start_date is None:
        start_date = await _get_earliest_activity_date(db, user_id, user_timezone)
        if start_date is None:
            # No activity at all, return empty array
            return []
    
    # Generate the complete date range
    all_dates = _generate_date_range(start_date, end_date)
    
    # Build conditions for database queries
    # We still need to filter by UTC time for the database query to be efficient
    utc_start, utc_end = _get_date_range(period)
    
    base_session_conditions = [Session.user_id == user_id]
    note_conditions = [Note.user_id == user_id]
    
    if period != 'all':
        base_session_conditions.append(Session.created_at >= utc_start)
        note_conditions.append(Note.created_at >= utc_start)
    
    # Local date expression for grouping
    # Note: user_timezone is validated at endpoint level before reaching here
    timezone_expr = _safe_timezone_expr("created_at", user_timezone)
    local_date_expr = func.date(timezone_expr)
    
    # Get completed sessions grouped by local date
    completed_sessions_query = (
        select(
            local_date_expr.label('activity_date'),
            func.count(Session.id).label('sessions_count')
        )
        .where(and_(*base_session_conditions, Session.status == 'completed'))
        .group_by(local_date_expr)
    )
    
    # Get abandoned sessions grouped by local date
    abandoned_sessions_query = (
        select(
            local_date_expr.label('activity_date'),
            func.count(Session.id).label('abandoned_count')
        )
        .where(and_(*base_session_conditions, Session.status == 'abandoned'))
        .group_by(local_date_expr)
    )
    
    # Get notes grouped by local date using PostgreSQL timezone conversion
    # Note: user_timezone is validated at endpoint level before reaching here
    notes_query = (
        select(
            func.date(timezone_expr).label('activity_date'),
            func.count(Note.id).label('notes_count')
        )
        .where(and_(*note_conditions))
        .group_by(func.date(timezone_expr))
    )
    
    # Execute all queries
    completed_result = await db.execute(completed_sessions_query)
    abandoned_result = await db.execute(abandoned_sessions_query)
    notes_result = await db.execute(notes_query)
    
    # Convert to dictionaries for easier merging
    completed_by_date = {row.activity_date: row.sessions_count for row in completed_result.fetchall()}
    abandoned_by_date = {row.activity_date: row.abandoned_count for row in abandoned_result.fetchall()}
    notes_by_date = {row.activity_date: row.notes_count for row in notes_result.fetchall()}
    
    # Build complete response with all dates in range
    activity_data = [
        DailyActivityResponse(
            date=activity_date,
            sessions_count=completed_by_date.get(activity_date, 0),
            abandoned_sessions_count=abandoned_by_date.get(activity_date, 0),
            notes_count=notes_by_date.get(activity_date, 0)
        )
        for activity_date in all_dates
    ]
    
    return activity_data


async def get_session_times(
    db: AsyncSession, user_id: UUID, period: str = '7d'
) -> List[SessionTimeResponse]:
    """Get session times chart data for the specified period.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        
    Returns:
        List of session times data.
    """
    start_date, end_date = _get_date_range(period)
    
    # Build conditions
    conditions = [Session.user_id == user_id]
    
    if period != 'all':
        conditions.append(Session.created_at >= start_date)
    
    # Query sessions with optional learning project names
    query = (
        select(
            Session.start_time,
            Session.actual_duration,
            LearningProject.name.label('project_name')
        )
        .select_from(Session)
        .outerjoin(LearningProject, Session.learning_project_id == LearningProject.id)
        .where(and_(*conditions))
        .order_by(Session.start_time)
    )
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    return [
        SessionTimeResponse(
            start_time=row.start_time,
            duration=row.actual_duration,
            project_name=row.project_name
        )
        for row in rows
    ]


async def get_focus_heatmap(
    db: AsyncSession, user_id: UUID, period: str = '7d', user_timezone: str = 'UTC'
) -> FocusHeatmapResponse:
    """Get focus heatmap data aggregated by day-of-week and hour.
    
    Aggregates session data into a grid of day-of-week (0-6, Mon-Sun) × hour (0-23),
    showing total focus minutes and session counts for each slot.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        user_timezone: User's timezone for accurate hour extraction.
        
    Returns:
        FocusHeatmapResponse with cells and max_minutes for normalization.
    """
    start_date, end_date = _get_date_range(period)
    
    # Build conditions
    conditions = [
        Session.user_id == user_id,
        Session.actual_duration.isnot(None),  # Only completed sessions
    ]
    
    if period != 'all':
        conditions.append(Session.created_at >= start_date)
    
    # PostgreSQL: Extract day of week and hour from start_time converted to user's timezone
    # ISODOW gives 1=Monday, 7=Sunday, so we subtract 1 to get 0=Monday, 6=Sunday
    # Note: user_timezone is validated at endpoint level before reaching here
    local_time_expr = _safe_timezone_expr("start_time", user_timezone)
    day_of_week_expr = func.extract('isodow', local_time_expr) - 1
    hour_expr = func.extract('hour', local_time_expr)
    
    query = (
        select(
            day_of_week_expr.label('day_of_week'),
            hour_expr.label('hour'),
            func.sum(Session.actual_duration).label('total_minutes'),
            func.count(Session.id).label('session_count')
        )
        .where(and_(*conditions))
        .group_by(day_of_week_expr, hour_expr)
    )
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    cells = [
        FocusHeatmapCell(
            day_of_week=int(row.day_of_week),
            hour=int(row.hour),
            total_minutes=int(row.total_minutes or 0),
            session_count=int(row.session_count or 0)
        )
        for row in rows
    ]
    
    max_minutes = max((cell.total_minutes for cell in cells), default=0)
    
    return FocusHeatmapResponse(cells=cells, max_minutes=max_minutes)


async def get_dashboard_data(
    db: AsyncSession, user_id: UUID, period: str = '7d', user_timezone: str = 'UTC'
) -> DashboardResponse:
    """Get complete dashboard data for the specified period.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        user_timezone: User's timezone for accurate date grouping.
        
    Returns:
        Complete dashboard data with timezone-aware date grouping.
    """
    logger.info(f"Fetching dashboard data for user {user_id} with period {period} and timezone {user_timezone}")
    
    # Fetch all dashboard data concurrently would be ideal, but for simplicity
    # and to avoid complex async coordination, we'll fetch sequentially
    stats = await get_dashboard_stats(db, user_id, period)
    project_stats = await get_project_stats(db, user_id, period)
    daily_activity = await get_daily_activity(db, user_id, period, user_timezone)
    session_times = await get_session_times(db, user_id, period)
    focus_heatmap = await get_focus_heatmap(db, user_id, period, user_timezone)
    
    return DashboardResponse(
        stats=stats,
        project_stats=project_stats,
        daily_activity=daily_activity,
        session_times=session_times,
        focus_heatmap=focus_heatmap
    ) 