from datetime import datetime, timedelta, date, UTC
from typing import List, Tuple, Optional
from uuid import UUID
from sqlalchemy import select, func, and_, case, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.db.models import Session, Note, LearningProject, User
from app.schemas.dashboard import (
    DashboardStatsResponse,
    ProjectStatsResponse,
    DailyActivityResponse,
    SessionTimeResponse,
    DashboardResponse
)


def _get_date_range(period: str) -> Tuple[datetime, datetime]:
    """Get the date range based on the period selection.
    
    Args:
        period: One of '7d', '2w', '4w', '3m', '1y', 'all'
        
    Returns:
        Tuple of (start_date, end_date)
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


async def get_daily_activity(
    db: AsyncSession, user_id: UUID, period: str = '7d', user_timezone: str = 'UTC'
) -> List[DailyActivityResponse]:
    """Get daily activity chart data grouped by user's local timezone.
    
    Args:
        db: The database session.
        user_id: The ID of the user.
        period: Time period ('7d', '2w', '4w', '3m', '1y', 'all').
        user_timezone: User's timezone (e.g., 'America/Bogota', 'UTC').
        
    Returns:
        List of daily activity data grouped by local date.
    """
    start_date, end_date = _get_date_range(period)
    
    # Build conditions
    session_conditions = [Session.user_id == user_id]
    note_conditions = [Note.user_id == user_id]
    
    if period != 'all':
        session_conditions.append(Session.created_at >= start_date)
        note_conditions.append(Note.created_at >= start_date)
    
    # Get sessions grouped by local date using PostgreSQL timezone conversion
    sessions_query = (
        select(
            func.date(text(f"created_at AT TIME ZONE '{user_timezone}'")).label('activity_date'),
            func.count(Session.id).label('sessions_count')
        )
        .where(and_(*session_conditions))
        .group_by(func.date(text(f"created_at AT TIME ZONE '{user_timezone}'")))
    )
    
    # Get notes grouped by local date using PostgreSQL timezone conversion  
    notes_query = (
        select(
            func.date(text(f"created_at AT TIME ZONE '{user_timezone}'")).label('activity_date'),
            func.count(Note.id).label('notes_count')
        )
        .where(and_(*note_conditions))
        .group_by(func.date(text(f"created_at AT TIME ZONE '{user_timezone}'")))
    )
    
    # Execute both queries
    sessions_result = await db.execute(sessions_query)
    notes_result = await db.execute(notes_query)
    
    # Convert to dictionaries for easier merging
    sessions_by_date = {row.activity_date: row.sessions_count for row in sessions_result.fetchall()}
    notes_by_date = {row.activity_date: row.notes_count for row in notes_result.fetchall()}
    
    # Merge data and create response
    all_dates = set(sessions_by_date.keys()) | set(notes_by_date.keys())
    
    activity_data = [
        DailyActivityResponse(
            date=activity_date,
            sessions_count=sessions_by_date.get(activity_date, 0),
            notes_count=notes_by_date.get(activity_date, 0)
        )
        for activity_date in sorted(all_dates)
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
    
    return DashboardResponse(
        stats=stats,
        project_stats=project_stats,
        daily_activity=daily_activity,
        session_times=session_times
    ) 