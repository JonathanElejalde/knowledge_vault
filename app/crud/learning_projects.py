from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.db.models import LearningProject, Category, Session, Note
from app.schemas.learning_projects import LearningProjectCreate, LearningProjectUpdate


async def validate_project_ownership(
    db: AsyncSession, project_id: UUID, user_id: UUID, allow_archived: bool = True
) -> Optional[LearningProject]:
    """Validate that a project exists and belongs to the user.

    This is a lightweight check for ownership validation when linking
    notes or sessions to a project. Does not eager load relationships.

    Args:
        db: The database session.
        project_id: The ID of the project to validate.
        user_id: The ID of the user who should own the project.
        allow_archived: If False, archived projects return None.

    Returns:
        The project if it exists and belongs to the user (and is not archived
        if allow_archived=False), None otherwise.
    """
    result = await db.execute(
        select(LearningProject).where(
            and_(LearningProject.id == project_id, LearningProject.user_id == user_id)
        )
    )
    project = result.scalars().first()

    if not project:
        return None

    if not allow_archived and project.status == "archived":
        logger.info(
            f"Project {project_id} is archived and allow_archived=False. "
            f"Returning None for user {user_id}."
        )
        return None

    return project


async def create_learning_project(
    db: AsyncSession,
    user_id: UUID,
    project_in: LearningProjectCreate,
    category_id: Optional[UUID] = None,
) -> LearningProject:
    """Create a new learning project for the user.

    Args:
        db: The database session.
        user_id: The ID of the user creating the project.
        project_in: The data for the new learning project (expects category_name, not category_id).
        category_id: The ID of the category to associate with the project.

    Returns:
        The created learning project.
    """
    project_data = project_in.model_dump()
    project_data.pop(
        "category_name", None
    )  # Remove category_name if present, as we use category_id

    project = LearningProject(**project_data, user_id=user_id, category_id=category_id)
    db.add(project)
    await db.commit()
    await db.refresh(project, attribute_names=["category"])  # Eager load category
    return project


async def get_learning_project(
    db: AsyncSession, project_id: UUID, user_id: UUID
) -> Optional[LearningProject]:
    """Get a specific learning project by ID, ensuring it belongs to the user.
    If the project is found but has a status of 'archived', it is treated as not found
    for general retrieval purposes and None is returned.

    Args:
        db: The database session.
        project_id: The ID of the project to retrieve.
        user_id: The ID of the user who owns the project.

    Returns:
        The learning project if found, not archived, and belongs to the user, otherwise None.
    """
    result = await db.execute(
        select(LearningProject)
        .where(
            and_(LearningProject.id == project_id, LearningProject.user_id == user_id)
        )
        .options(
            selectinload(LearningProject.sessions),
            selectinload(LearningProject.category),  # Eager load category
        )
    )
    project = result.scalars().first()

    if project and project.status == "archived":
        logger.info(
            f"Attempted to retrieve archived learning project {project_id} for user {user_id}. Returning None."
        )
        return None

    return project


async def get_user_learning_projects(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    category_name: Optional[str] = None,  # Changed from category to category_name
    status: Optional[str] = None,
    include_archived: bool = False,
    search_query: Optional[str] = None,
) -> List[LearningProject]:
    """Get a list of user's learning projects with optional filters.

    By default, archived projects are excluded unless specifically requested by the
    status filter or the include_archived flag.

    Args:
        db: The database session.
        user_id: The ID of the user whose projects to retrieve.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        category_name: Optional filter for project category name.
        status: Optional filter for project status. If provided, this takes precedence.
        include_archived: If True and no specific status is given, archived projects are included.
        search_query: Optional search query to filter projects by name (case-insensitive partial match).

    Returns:
        A list of learning projects.
    """
    query = select(LearningProject).where(LearningProject.user_id == user_id)
    query = query.options(
        selectinload(LearningProject.category)
    )  # Eager load category for all

    # Add search filter if specified (case-insensitive partial match)
    if search_query:
        search_pattern = f"%{search_query.strip()}%"
        query = query.where(LearningProject.name.ilike(search_pattern))

    if category_name:
        query = query.join(Category).where(
            Category.name == category_name
        )  # Join and filter by Category.name

    # Handle status filtering logic
    if status:  # If a specific status is requested, use that
        query = query.where(LearningProject.status == status)
    elif not include_archived:  # Otherwise, if not including archived, filter them out
        query = query.where(LearningProject.status != "archived")

    query = query.order_by(LearningProject.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_learning_project(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    project_in: LearningProjectUpdate,
    category_id: Optional[UUID] = None,
) -> Optional[LearningProject]:
    """Update an existing learning project.

    Args:
        db: The database session.
        project_id: The ID of the project to update.
        user_id: The ID of the user who owns the project.
        project_in: The data to update the project with (expects category_name).
        category_id: The ID of the new category if category_name was provided and resolved.

    Returns:
        The updated learning project if found and updated, otherwise None.
    """
    stmt = select(LearningProject).where(
        and_(LearningProject.id == project_id, LearningProject.user_id == user_id)
    )
    result = await db.execute(stmt)
    project = result.scalars().first()

    if not project:
        return None

    if project.status == "archived":
        logger.warning(
            f"Attempt to update archived learning project {project_id} for user {user_id}. Operation denied."
        )
        return None

    update_data = project_in.model_dump(exclude_unset=True)
    update_data.pop("category_name", None)  # Remove category_name as we use category_id

    if (
        category_id is not None
    ):  # If a new category_id is provided (even if it's to set to None implicitly by not finding a category_name)
        project.category_id = category_id
    elif (
        project_in.category_name is None
        and "category_name" in project_in.model_fields_set
    ):  # Explicitly setting category to None
        project.category_id = None

    for key, value in update_data.items():
        setattr(project, key, value)

    await db.commit()
    await db.refresh(project, attribute_names=["category"])  # Eager load category
    return project


async def delete_learning_project(
    db: AsyncSession, project_id: UUID, user_id: UUID
) -> Optional[LearningProject]:
    """Soft delete a learning project by setting its status to 'archived'.

    Args:
        db: The database session.
        project_id: The ID of the project to soft delete.
        user_id: The ID of the user who owns the project.

    Returns:
        The updated learning project with status 'archived' if found, otherwise None.
    """
    stmt = (
        select(LearningProject)
        .where(
            and_(LearningProject.id == project_id, LearningProject.user_id == user_id)
        )
        .options(
            selectinload(LearningProject.sessions),
            selectinload(LearningProject.category),  # Eager load category
        )
    )
    result = await db.execute(stmt)
    project = result.scalars().first()

    if not project:
        logger.info(
            f"Learning project with ID {project_id} for user {user_id} not found for soft delete."
        )
        return None

    if project.status == "archived":
        logger.info(
            f"Learning project {project_id} for user {user_id} is already archived."
        )
        return project  # Return the project as is if already archived

    logger.info(
        f"Found learning project {project_id} for user {user_id}. Setting status to 'archived'."
    )
    project.status = "archived"

    await db.commit()
    await db.refresh(project, attribute_names=["category"])
    logger.info(f"Successfully soft-deleted (archived) learning project {project_id}.")
    return project


def _build_project_query_with_counts(user_id: UUID, project_id: Optional[UUID] = None):
    """Helper function to build a query for learning projects with notes and sessions counts.

    Args:
        user_id: The ID of the user whose projects to query.
        project_id: Optional specific project ID to filter by.

    Returns:
        A SQLAlchemy select query with counts.
    """
    # Create subqueries for counting notes and sessions
    # Filter by user_id to prevent cross-tenant data leakage
    notes_subquery = (
        select(func.count(Note.id))
        .where(
            and_(
                Note.learning_project_id == LearningProject.id,
                Note.user_id == LearningProject.user_id,
            )
        )
        .scalar_subquery()
        .label("notes_count")
    )

    sessions_subquery = (
        select(func.count(Session.id))
        .where(
            and_(
                Session.learning_project_id == LearningProject.id,
                Session.user_id == LearningProject.user_id,
            )
        )
        .scalar_subquery()
        .label("sessions_count")
    )

    # Build the main query with counts
    query = select(LearningProject, notes_subquery, sessions_subquery).where(
        LearningProject.user_id == user_id
    )

    # Add project ID filter if specified
    if project_id:
        query = query.where(LearningProject.id == project_id)

    return query


async def _convert_project_row_to_dict(
    db: AsyncSession, row, include_sessions: bool = False
) -> dict:
    """Helper function to convert a query result row to a project dictionary.

    Args:
        db: The database session.
        row: The query result row containing (project, notes_count, sessions_count).
        include_sessions: Whether to include sessions data in the result.

    Returns:
        A dictionary containing the project data with counts.
    """
    project, notes_count, sessions_count = row

    # Load the category if needed
    if project.category_id:
        category_result = await db.execute(
            select(Category).where(Category.id == project.category_id)
        )
        category = category_result.scalars().first()
        project.category = category

    # Convert to dict and add counts
    project_dict = {
        "id": project.id,
        "user_id": project.user_id,
        "name": project.name,
        "category_name": project.category.name if project.category else None,
        "description": project.description,
        "status": project.status,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "notes_count": notes_count or 0,
        "sessions_count": sessions_count or 0,
    }

    # Include sessions data if requested
    # Filter by user_id to prevent cross-tenant data leakage
    if include_sessions:
        sessions_result = await db.execute(
            select(Session)
            .where(
                and_(
                    Session.learning_project_id == project.id,
                    Session.user_id == project.user_id,
                )
            )
            .order_by(Session.start_time.desc())
        )
        sessions = sessions_result.scalars().all()

        # Convert sessions to dictionaries
        sessions_data = []
        for session in sessions:
            session_dict = {
                "id": session.id,
                "user_id": session.user_id,
                "learning_project_id": session.learning_project_id,
                "start_time": session.start_time,
                "end_time": session.end_time,
                "work_duration": session.work_duration,
                "break_duration": session.break_duration,
                "actual_duration": session.actual_duration,
                "session_type": session.session_type,
                "status": session.status,
                "title": session.title,
                "meta_data": session.meta_data,
            }
            sessions_data.append(session_dict)

        project_dict["sessions"] = sessions_data

    return project_dict


async def get_user_learning_projects_with_counts(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    category_name: Optional[str] = None,
    status: Optional[str] = None,
    include_archived: bool = False,
    search_query: Optional[str] = None,
) -> List[dict]:
    """Get a list of user's learning projects with notes and sessions counts.

    This function efficiently fetches learning projects along with their associated
    notes and sessions counts using subqueries to avoid N+1 query problems.

    Args:
        db: The database session.
        user_id: The ID of the user whose projects to retrieve.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        category_name: Optional filter for project category name.
        status: Optional filter for project status. If provided, this takes precedence.
        include_archived: If True and no specific status is given, archived projects are included.
        search_query: Optional search query to filter projects by name (case-insensitive partial match).

    Returns:
        A list of dictionaries containing learning project data with counts.
    """
    # Build the base query with counts
    query = _build_project_query_with_counts(user_id)

    # Add search filter if specified (case-insensitive partial match)
    if search_query:
        search_pattern = f"%{search_query.strip()}%"
        query = query.where(LearningProject.name.ilike(search_pattern))

    # Add category filter if specified
    if category_name:
        query = query.join(Category).where(Category.name == category_name)

    # Handle status filtering logic
    if status:  # If a specific status is requested, use that
        query = query.where(LearningProject.status == status)
    elif not include_archived:  # Otherwise, if not including archived, filter them out
        query = query.where(LearningProject.status != "archived")

    # Add ordering and pagination
    query = query.order_by(LearningProject.created_at.desc()).offset(skip).limit(limit)

    # Execute the query
    result = await db.execute(query)
    rows = result.all()

    # Convert results to dictionaries with counts
    projects_with_counts = []
    for row in rows:
        project_dict = await _convert_project_row_to_dict(
            db, row, include_sessions=False
        )
        projects_with_counts.append(project_dict)

    return projects_with_counts


async def get_learning_project_with_counts(
    db: AsyncSession, project_id: UUID, user_id: UUID
) -> Optional[dict]:
    """Get a specific learning project by ID with notes and sessions counts, including sessions data.

    Args:
        db: The database session.
        project_id: The ID of the project to retrieve.
        user_id: The ID of the user who owns the project.

    Returns:
        A dictionary containing the learning project data with counts and sessions if found, otherwise None.
    """
    # Build the query with counts for a specific project
    query = _build_project_query_with_counts(user_id, project_id)

    result = await db.execute(query)
    row = result.first()

    if not row:
        return None

    project, _, _ = row

    # Check if project is archived
    if project.status == "archived":
        logger.info(
            f"Attempted to retrieve archived learning project {project_id} for user {user_id}. Returning None."
        )
        return None

    # Convert to dictionary with counts and sessions
    project_dict = await _convert_project_row_to_dict(db, row, include_sessions=True)

    return project_dict
