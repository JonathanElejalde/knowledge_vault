from typing import Annotated, List, Optional, Union
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user
from app.db.models import User, Note
from app.db.session import get_db
from app.crud import notes as crud_notes
from app.schemas.notes import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteDetailResponse
)

router = APIRouter(
    tags=["Notes"]
)


def _map_note_to_response(note: Union[Note, dict]) -> dict:
    """Helper to map Note ORM model or dict to a dictionary suitable for response models."""
    if isinstance(note, dict):
        # Already a dictionary from the CRUD function
        return note
    
    # Handle ORM object (for backward compatibility)
    response_data = note.__dict__.copy()
    
    # Add related data for detail response if available
    if hasattr(note, 'learning_project') and note.learning_project:
        response_data['learning_project_name'] = note.learning_project.name
    elif 'learning_project_name' not in response_data:
        response_data['learning_project_name'] = None
    
    return response_data


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_in: NoteCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> NoteResponse:
    """Create a new note for the current user.

    Args:
        note_in: The note data to create.
        current_user: The authenticated user creating the note.
        db: The database session.

    Returns:
        The created note.
    """
    created_note = await crud_notes.create_note(
        db=db, user_id=current_user.id, note_in=note_in
    )
    return NoteResponse.model_validate(_map_note_to_response(created_note))


@router.get("/", response_model=List[NoteDetailResponse])
async def list_notes(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    learning_project_id: Optional[UUID] = Query(None, description="Filter notes by learning project ID"),
    tags: Optional[List[str]] = Query(None, description="Filter notes containing any of these tags"),
    q: Optional[str] = Query(None, max_length=255, description="Search query to filter notes by title or content (case-insensitive partial match)"),
    semantic_q: Optional[str] = Query(None, max_length=255, description="Semantic search query using AI embeddings for natural language search")
) -> List[NoteDetailResponse]:
    """List notes for the current user with optional filters and semantic search.

    Args:
        current_user: The authenticated user whose notes to list.
        db: The database session.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        learning_project_id: Optional filter for notes from a specific learning project.
        tags: Optional filter for notes containing any of the specified tags.
        q: Optional search query to filter notes by title or content (case-insensitive partial match).
        semantic_q: Optional semantic search query using AI embeddings for natural language search.

    Returns:
        A list of notes with their associated learning project names, ordered by relevance if semantic search is used.
    """
    notes = await crud_notes.get_user_notes(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        learning_project_id=learning_project_id,
        tags=tags,
        search_query=q,
        semantic_query=semantic_q
    )
    return [NoteDetailResponse.model_validate(_map_note_to_response(n)) for n in notes]


@router.get("/{note_id}", response_model=NoteDetailResponse)
async def get_note(
    note_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> NoteDetailResponse:
    """Get a specific note by ID, including related data.

    Args:
        note_id: The ID of the note to retrieve.
        current_user: The authenticated user.
        db: The database session.

    Returns:
        The requested note with related data.

    Raises:
        HTTPException: 404 if the note is not found.
    """
    note = await crud_notes.get_note(db=db, note_id=note_id, user_id=current_user.id)
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return NoteDetailResponse.model_validate(_map_note_to_response(note))


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: UUID,
    note_in: NoteUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> NoteResponse:
    """Update an existing note.

    Args:
        note_id: The ID of the note to update.
        note_in: The note data to update.
        current_user: The authenticated user.
        db: The database session.

    Returns:
        The updated note.

    Raises:
        HTTPException: 404 if the note is not found.
    """
    updated_note = await crud_notes.update_note(
        db=db, note_id=note_id, user_id=current_user.id, note_in=note_in
    )
    if not updated_note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return NoteResponse.model_validate(_map_note_to_response(updated_note))


@router.delete("/{note_id}", response_model=NoteResponse, status_code=status.HTTP_200_OK)
async def delete_note(
    note_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> NoteResponse:
    """Delete a note.

    Args:
        note_id: The ID of the note to delete.
        current_user: The authenticated user.
        db: The database session.

    Returns:
        The deleted note.

    Raises:
        HTTPException: 404 if the note is not found.
    """
    deleted_note = await crud_notes.delete_note(
        db=db, note_id=note_id, user_id=current_user.id
    )
    if not deleted_note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return NoteResponse.model_validate(_map_note_to_response(deleted_note))
