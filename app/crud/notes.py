from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger

from app.db.models import Note, User, Session, LearningProject
from app.schemas.notes import NoteCreate, NoteUpdate


async def create_note(
    db: AsyncSession, user_id: UUID, note_in: NoteCreate
) -> Note:
    """Create a new note for the user.

    Args:
        db: The database session.
        user_id: The ID of the user creating the note.
        note_in: The data for the new note.

    Returns:
        The created note.
    """
    note_data = note_in.model_dump()
    
    note = Note(
        **note_data,
        user_id=user_id
    )
    db.add(note)
    await db.commit()
    await db.refresh(note, attribute_names=['learning_project', 'user'])
    return note


async def get_note(
    db: AsyncSession, note_id: UUID, user_id: UUID
) -> Optional[Note]:
    """Get a specific note by ID, ensuring it belongs to the user.

    Args:
        db: The database session.
        note_id: The ID of the note to retrieve.
        user_id: The ID of the user who owns the note.

    Returns:
        The note if found and belongs to the user, otherwise None.
    """
    result = await db.execute(
        select(Note)
        .where(and_(Note.id == note_id, Note.user_id == user_id))
        .options(
            selectinload(Note.learning_project),
            selectinload(Note.user)
        )
    )
    return result.scalars().first()


async def get_user_notes(
    db: AsyncSession,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    learning_project_id: Optional[UUID] = None,
    tags: Optional[List[str]] = None,
    search_query: Optional[str] = None
) -> List[Note]:
    """Get a list of user's notes with optional filters.

    Args:
        db: The database session.
        user_id: The ID of the user whose notes to retrieve.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        learning_project_id: Optional filter for notes from a specific learning project.
        tags: Optional filter for notes containing any of the specified tags.
        search_query: Optional search query to filter notes by title or content (case-insensitive partial match).

    Returns:
        A list of notes.
    """
    query = select(Note).where(Note.user_id == user_id)
    query = query.options(
        selectinload(Note.learning_project)
    )

    # Add search filter if specified (case-insensitive partial match on title and content)
    if search_query:
        search_pattern = f"%{search_query.strip()}%"
        query = query.where(
            or_(
                Note.title.ilike(search_pattern),
                Note.content.ilike(search_pattern)
            )
        )

    # Add learning project filter if specified
    if learning_project_id:
        query = query.where(Note.learning_project_id == learning_project_id)

    # Add tags filter if specified (notes containing any of the specified tags)
    if tags:
        query = query.where(Note.tags.op('&&')(tags))

    query = query.order_by(Note.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def update_note(
    db: AsyncSession, note_id: UUID, user_id: UUID, note_in: NoteUpdate
) -> Optional[Note]:
    """Update an existing note.

    Args:
        db: The database session.
        note_id: The ID of the note to update.
        user_id: The ID of the user who owns the note.
        note_in: The data to update the note with.

    Returns:
        The updated note if found and updated, otherwise None.
    """
    stmt = select(Note).where(
        and_(Note.id == note_id, Note.user_id == user_id)
    )
    result = await db.execute(stmt)
    note = result.scalars().first()

    if not note:
        return None

    update_data = note_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(note, key, value)

    await db.commit()
    await db.refresh(note, attribute_names=['learning_project', 'user'])
    return note


async def delete_note(db: AsyncSession, note_id: UUID, user_id: UUID) -> Optional[Note]:
    """Delete a note.
    
    Args:
        db: The database session.
        note_id: The ID of the note to delete.
        user_id: The ID of the user who owns the note.

    Returns:
        The deleted note if found, otherwise None.
    """
    stmt = (
        select(Note)
        .where(and_(Note.id == note_id, Note.user_id == user_id))
        .options(
            selectinload(Note.learning_project)
        )
    )
    result = await db.execute(stmt)
    note = result.scalars().first()

    if not note:
        logger.info(f"Note with ID {note_id} for user {user_id} not found for deletion.")
        return None

    logger.info(f"Found note {note_id} for user {user_id}. Deleting note.")
    await db.delete(note)
    await db.commit()
    logger.info(f"Successfully deleted note {note_id}.")
    return note


