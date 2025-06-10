from typing import Optional, List
from uuid import UUID
from sqlalchemy import select, and_, or_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from loguru import logger
import openai

from app.db.models import Note, User, Session, LearningProject
from app.schemas.notes import NoteCreate, NoteUpdate
from app.core.config import get_settings
from app.services.vector_store import get_default_vector_store, generate_query_embedding


async def _generate_embedding_for_note(note_content: str, note_title: Optional[str] = None, note_tags: Optional[List[str]] = None) -> Optional[List[float]]:
    """Generate embedding for note content.
    
    Args:
        note_content: The note content
        note_title: Optional note title
        note_tags: Optional note tags
        
    Returns:
        Embedding vector or None if generation fails
    """
    try:
        settings = get_settings()
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not configured, skipping embedding generation")
            return None
            
        # Prepare text for embedding (same logic as in embed_notes.py)
        text_parts = []
        if note_title and note_title.strip():
            text_parts.append(f"Title: {note_title.strip()}")
        if note_content and note_content.strip():
            text_parts.append(f"Content: {note_content.strip()}")
        if note_tags:
            tags_str = ", ".join(note_tags)
            text_parts.append(f"Tags: {tags_str}")
            
        combined_text = "\n".join(text_parts)
        if not combined_text.strip():
            return None
            
        # Generate embedding
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=[combined_text],
            encoding_format="float"
        )
        
        return response.data[0].embedding
        
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None


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
    
    # Generate embedding for new note
    embedding = await _generate_embedding_for_note(
        note_data.get("content", ""),
        note_data.get("title"),
        note_data.get("tags", [])
    )
    
    note = Note(
        **note_data,
        user_id=user_id,
        embedding=embedding
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
    search_query: Optional[str] = None,
    semantic_query: Optional[str] = None
) -> List[Note]:
    """Get a list of user's notes with optional filters and semantic search.

    Args:
        db: The database session.
        user_id: The ID of the user whose notes to retrieve.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).
        learning_project_id: Optional filter for notes from a specific learning project.
        tags: Optional filter for notes containing any of the specified tags.
        search_query: Optional search query to filter notes by title or content (case-insensitive partial match).
        semantic_query: Optional semantic search query using vector similarity.

    Returns:
        A list of notes, ordered by relevance if semantic search is used, otherwise by creation date.
    """
    base_query = select(Note).where(Note.user_id == user_id)
    base_query = base_query.options(
        selectinload(Note.learning_project)
    )

    # If semantic search is requested, use vector store abstraction
    if semantic_query and semantic_query.strip():
        try:
            # Generate embedding for the search query
            query_embedding = await generate_query_embedding(semantic_query.strip())
            
            if query_embedding:
                # Get vector store instance
                vector_store = await get_default_vector_store(db)
                
                # Build filters for vector store
                filters = {"user_id": user_id}
                if learning_project_id:
                    filters["learning_project_id"] = learning_project_id
                if tags:
                    filters["tags"] = tags
                
                # Query vector store
                vector_results = await vector_store.query_vectors(
                    query_vector=query_embedding,
                    limit=limit,
                    filters=filters
                )
                
                # Convert vector store results to Note objects
                notes = []
                result_ids = [result["id"] for result in vector_results]
                
                if result_ids:
                    # Fetch full Note objects with relationships, preserving order
                    for note_id in result_ids[skip:skip + limit]:  # Apply pagination
                        note_result = await db.execute(
                            select(Note)
                            .where(Note.id == UUID(note_id))
                            .options(selectinload(Note.learning_project))
                        )
                        note = note_result.scalars().first()
                        if note:
                            notes.append(note)
                
                return notes
                
        except Exception as e:
            logger.error(f"Semantic search failed, falling back to regular search: {e}")
            # Fall through to regular search

    # Regular search (non-semantic)
    query = base_query

    # Add keyword search filter if specified (case-insensitive partial match on title and content)
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
    
    # Check if content-related fields changed to regenerate embedding
    content_changed = any(key in update_data for key in ['content', 'title', 'tags'])
    
    for key, value in update_data.items():
        setattr(note, key, value)

    # Regenerate embedding if content changed
    if content_changed:
        new_embedding = await _generate_embedding_for_note(
            note.content,
            note.title,
            note.tags
        )
        if new_embedding:
            note.embedding = new_embedding

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


