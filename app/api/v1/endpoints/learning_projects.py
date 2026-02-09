from typing import Annotated, List, Optional, Union
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.dependencies import get_current_active_user, general_rate_limit
from app.db.models import User, LearningProject
from app.db.session import get_db
from app.crud import learning_projects as crud_lp
from app.crud import categories as crud_categories
from app.schemas.learning_projects import (
    LearningProjectCreate,
    LearningProjectUpdate,
    LearningProjectResponse,
    LearningProjectDetailResponse
)

router = APIRouter(
    tags=["Learning Projects"],
    dependencies=[general_rate_limit]  # Apply rate limiting to all learning project endpoints
)

def _map_project_to_response(project: Union[LearningProject, dict]) -> dict:
    """Helper to map LearningProject ORM model or dict to a dictionary suitable for response models."""
    if isinstance(project, dict):
        # Already a dictionary with counts from the new CRUD function
        return project
    
    # Handle ORM object (for backward compatibility)
    response_data = project.__dict__.copy()
    # Avoid triggering lazy loads in async contexts; only use already-loaded relationships.
    loaded_category = project.__dict__.get('category')
    if loaded_category:
        response_data['category_name'] = loaded_category.name
    else:
        response_data['category_name'] = None
    
    # Add default counts if not present (for single project retrieval)
    if 'notes_count' not in response_data:
        response_data['notes_count'] = 0
    if 'sessions_count' not in response_data:
        response_data['sessions_count'] = 0
    
    # Handle sessions for detail response only when relationship was preloaded.
    loaded_sessions = project.__dict__.get('sessions')
    if loaded_sessions:
        sessions_data = []
        for session in loaded_sessions:
            session_dict = {
                'id': session.id,
                'user_id': session.user_id,
                'learning_project_id': session.learning_project_id,
                'start_time': session.start_time,
                'end_time': session.end_time,
                'work_duration': session.work_duration,
                'break_duration': session.break_duration,
                'actual_duration': session.actual_duration,
                'session_type': session.session_type,
                'status': session.status,
                'title': session.title,
                'meta_data': session.meta_data
            }
            sessions_data.append(session_dict)
        response_data['sessions'] = sessions_data
    elif 'sessions' not in response_data:
        response_data['sessions'] = []
    
    return response_data

@router.post("/", response_model=LearningProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_learning_project(
    project_in: LearningProjectCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> LearningProjectResponse:
    """Create a new learning project for the current user.

    Args:
        project_in: The learning project data to create.
        current_user: The authenticated user creating the project.
        db: The database session.

    Returns:
        The created learning project.
    """
    category_id: Optional[UUID] = None
    if project_in.category_name:
        category = await crud_categories.get_or_create_category_by_name(
            db=db, user_id=current_user.id, name=project_in.category_name
        )
        category_id = category.id
    
    created_project = await crud_lp.create_learning_project(
        db=db, user_id=current_user.id, project_in=project_in, category_id=category_id
    )
    return LearningProjectResponse.model_validate(_map_project_to_response(created_project))


@router.get("/", response_model=List[LearningProjectResponse])
async def list_learning_projects(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    category_name: Optional[str] = Query(None, alias="category", max_length=100),
    status_filter: Optional[str] = Query(None, alias="status", max_length=50, pattern="^(in_progress|completed|on_hold|abandoned|archived)$"),
    include_archived: bool = Query(False, description="Whether to include archived projects if no specific status is requested"),
    q: Optional[str] = Query(None, max_length=255, description="Search query to filter projects by name (case-insensitive partial match)")
) -> List[LearningProjectResponse]:
    """List learning projects for the current user with optional filters.

    By default, archived projects are excluded unless status_filter is 'archived'
    or include_archived is True. This endpoint efficiently includes notes_count
    and sessions_count for each project.

    Args:
        current_user: The authenticated user whose projects to list.
        db: The database session.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        category_name: Optional filter for project category.
        status_filter: Optional filter for project status (aliased as 'status' in query).
        include_archived: If True and status_filter is not set, archived projects are included.
        q: Optional search query to filter projects by name (case-insensitive partial match).

    Returns:
        A list of learning projects with notes and sessions counts.
    """
    projects_with_counts = await crud_lp.get_user_learning_projects_with_counts(
        db=db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit, 
        category_name=category_name, 
        status=status_filter, 
        include_archived=include_archived,
        search_query=q
    )
    return [LearningProjectResponse.model_validate(_map_project_to_response(p)) for p in projects_with_counts]


@router.get("/{project_id}", response_model=LearningProjectDetailResponse)
async def get_learning_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> LearningProjectDetailResponse:
    """Get a specific learning project by ID, including notes and sessions counts.

    Args:
        project_id: The ID of the learning project to retrieve.
        current_user: The authenticated user.
        db: The database session.

    Returns:
        The requested learning project with counts.

    Raises:
        HTTPException: 404 if the project is not found.
    """
    project = await crud_lp.get_learning_project_with_counts(db=db, project_id=project_id, user_id=current_user.id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning project not found")
    return LearningProjectDetailResponse.model_validate(_map_project_to_response(project))


@router.put("/{project_id}", response_model=LearningProjectResponse)
async def update_learning_project(
    project_id: UUID,
    project_in: LearningProjectUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> LearningProjectResponse:
    """Update an existing learning project.

    Args:
        project_id: The ID of the learning project to update.
        project_in: The learning project data to update.
        current_user: The authenticated user.
        db: The database session.

    Returns:
        The updated learning project.

    Raises:
        HTTPException: 404 if the project is not found.
    """
    # First, get the existing project to check if it exists and is not archived
    existing_project = await crud_lp.get_learning_project(db=db, project_id=project_id, user_id=current_user.id)
    if not existing_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning project not found or archived")

    category_id_to_update: Optional[UUID] = existing_project.category_id # Keep existing if not changed

    if project_in.category_name is not None:
        category = await crud_categories.get_or_create_category_by_name(
            db=db, user_id=current_user.id, name=project_in.category_name
        )
        category_id_to_update = category.id
    elif 'category_name' in project_in.model_fields_set and project_in.category_name is None:
        # Explicitly setting category to None
        category_id_to_update = None
        
    updated_project = await crud_lp.update_learning_project(
        db=db, project_id=project_id, user_id=current_user.id, project_in=project_in, category_id=category_id_to_update
    )
    if not updated_project:
        # This case should be rare given the check above, but for safety:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning project not found after update attempt")
    return LearningProjectResponse.model_validate(_map_project_to_response(updated_project))


@router.delete("/{project_id}", response_model=LearningProjectResponse, status_code=status.HTTP_200_OK)
async def delete_learning_project(
    project_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> LearningProjectResponse:
    """Soft delete a learning project by archiving it.

    Sets the learning project's status to 'archived'.
    If the project is already archived, a 409 Conflict error is returned.

    Args:
        project_id: The ID of the learning project to archive.
        current_user: The authenticated user.
        db: The database session.

    Returns:
        The updated learning project with status 'archived'.

    Raises:
        HTTPException:
            - 404: If the project is not found.
            - 409: If the project is already archived.
    """
    # Fetch the project directly to check its current status before attempting deletion (archival)
    stmt = select(LearningProject).where(
        LearningProject.id == project_id, LearningProject.user_id == current_user.id
    )
    result = await db.execute(stmt)
    project_to_archive = result.scalars().first()

    if not project_to_archive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning project not found"
        )

    if project_to_archive.status == "archived":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Learning project is already archived"
        )

    archived_project = await crud_lp.delete_learning_project(
        db=db, project_id=project_id, user_id=current_user.id
    )

    if not archived_project: # Should not happen if above checks are correct
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to archive learning project after validation"
        )
    
    return LearningProjectResponse.model_validate(_map_project_to_response(archived_project)) 
