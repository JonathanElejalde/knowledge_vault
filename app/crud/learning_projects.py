from datetime import datetime, UTC
from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.db.models import LearningProject # Removed User, Session as they are not directly used here
from app.schemas.learning_projects import LearningProjectCreate, LearningProjectUpdate


async def create_learning_project(
    db: AsyncSession, user_id: UUID, project_in: LearningProjectCreate
) -> LearningProject:
    """Create a new learning project for the user.

    Args:
        db: The database session.
        user_id: The ID of the user creating the project.
        project_in: The data for the new learning project.

    Returns:
        The created learning project.
    """
    project = LearningProject(
        **project_in.model_dump(), user_id=user_id, created_at=datetime.now(UTC), updated_at=datetime.now(UTC)
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
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
        .where(and_(LearningProject.id == project_id, LearningProject.user_id == user_id))
        .options(selectinload(LearningProject.sessions))  # Eager load sessions for detail view
    )
    project = result.scalars().first()

    if project and project.status == "archived":
        logger.info(f"Attempted to retrieve archived learning project {project_id} for user {user_id}. Returning None.")
        return None
    
    return project


async def get_user_learning_projects(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    status: Optional[str] = None,
    include_archived: bool = False
) -> List[LearningProject]:
    """Get a list of user's learning projects with optional filters.

    By default, archived projects are excluded unless specifically requested by the
    status filter or the include_archived flag.

    Args:
        db: The database session.
        user_id: The ID of the user whose projects to retrieve.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        category: Optional filter for project category.
        status: Optional filter for project status. If provided, this takes precedence.
        include_archived: If True and no specific status is given, archived projects are included.

    Returns:
        A list of learning projects.
    """
    query = select(LearningProject).where(LearningProject.user_id == user_id)

    if category:
        query = query.where(LearningProject.category == category)
    
    # Handle status filtering logic
    if status:  # If a specific status is requested, use that
        query = query.where(LearningProject.status == status)
    elif not include_archived:  # Otherwise, if not including archived, filter them out
        query = query.where(LearningProject.status != "archived")

    query = query.order_by(LearningProject.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_learning_project(
    db: AsyncSession, project_id: UUID, user_id: UUID, project_in: LearningProjectUpdate
) -> Optional[LearningProject]:
    """Update an existing learning project.

    Args:
        db: The database session.
        project_id: The ID of the project to update.
        user_id: The ID of the user who owns the project.
        project_in: The data to update the project with.

    Returns:
        The updated learning project if found and updated, otherwise None.
    """
    # Use a separate query for the update to avoid issues with get_learning_project
    # if it has different eager loading options in the future.
    stmt = select(LearningProject).where(
        and_(LearningProject.id == project_id, LearningProject.user_id == user_id)
    )
    result = await db.execute(stmt)
    project = result.scalars().first()

    if not project:
        return None

    # Prevent updates to archived projects
    if project.status == "archived":
        logger.warning(
            f"Attempt to update archived learning project {project_id} for user {user_id}. Operation denied."
        )
        return None

    update_data = project_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    project.updated_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(project)
    return project


async def delete_learning_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> Optional[LearningProject]:
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
        .where(and_(LearningProject.id == project_id, LearningProject.user_id == user_id))
        .options(selectinload(LearningProject.sessions)) # Kept for now, can be reviewed for removal if sessions not needed here
    )
    result = await db.execute(stmt)
    project = result.scalars().first()

    if not project:
        logger.info(f"Learning project with ID {project_id} for user {user_id} not found for soft delete.")
        return None
    
    if project.status == "archived":
        logger.info(f"Learning project {project_id} for user {user_id} is already archived.")
        return project # Return the project as is if already archived

    logger.info(f"Found learning project {project_id} for user {user_id}. Setting status to 'archived'.")
    project.status = "archived"
    project.updated_at = datetime.now(UTC)
    
    await db.commit()
    await db.refresh(project)
    logger.info(f"Successfully soft-deleted (archived) learning project {project_id}.")
    return project 