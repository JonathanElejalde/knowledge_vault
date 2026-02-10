#!/usr/bin/env python3
"""
Embedding utility script for generating and backfilling note embeddings.

This script:
1. Fetches notes that don't have embeddings
2. Generates embeddings using OpenAI's text-embedding-3-small model
3. Processes in batches to respect API limits and reduce costs
4. Upserts embedding vectors back to the database

Usage:
    python scripts/embed_notes.py [--batch-size 100] [--dry-run] [--force-all]
"""

import asyncio
import argparse
import sys
from pathlib import Path
from typing import List, Optional
from loguru import logger
import openai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add the project root to Python path so we can import app modules
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.core.config import get_settings  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.db.models import Note  # noqa: E402


class EmbeddingGenerator:
    """Handles embedding generation using OpenAI API."""

    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        """Initialize the embedding generator.

        Args:
            api_key: OpenAI API key
            model: Embedding model to use (default: text-embedding-3-small)
        """
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = model
        self.embedding_dim = 1536  # Dimension for text-embedding-3-small

    async def generate_embeddings(
        self, texts: List[str], batch_size: int = 100
    ) -> List[List[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed
            batch_size: Number of texts to process in each API call

        Returns:
            List of embedding vectors (each vector is a list of floats)

        Raises:
            Exception: If OpenAI API call fails
        """
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            logger.info(
                f"Generating embeddings for batch {i // batch_size + 1}, texts {i + 1}-{min(i + len(batch), len(texts))}"
            )

            try:
                response = await self.client.embeddings.create(
                    model=self.model, input=batch, encoding_format="float"
                )

                batch_embeddings = [data.embedding for data in response.data]
                all_embeddings.extend(batch_embeddings)

                logger.success(f"Generated {len(batch_embeddings)} embeddings")

            except Exception as e:
                logger.error(
                    f"Failed to generate embeddings for batch {i // batch_size + 1}: {e}"
                )
                raise

        return all_embeddings


class NotesEmbeddingService:
    """Service for managing note embeddings in the database."""

    def __init__(self, embedding_generator: EmbeddingGenerator):
        """Initialize the service.

        Args:
            embedding_generator: Instance of EmbeddingGenerator
        """
        self.embedding_generator = embedding_generator

    async def get_notes_without_embeddings(
        self, db: AsyncSession, limit: Optional[int] = None
    ) -> List[Note]:
        """Fetch notes that don't have embeddings.

        Args:
            db: Database session
            limit: Optional limit on number of notes to fetch

        Returns:
            List of Note objects without embeddings
        """
        query = select(Note).where(Note.embedding.is_(None))

        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        notes = result.scalars().all()

        logger.info(f"Found {len(notes)} notes without embeddings")
        return notes

    async def get_all_notes(
        self, db: AsyncSession, limit: Optional[int] = None
    ) -> List[Note]:
        """Fetch all notes (for force regeneration).

        Args:
            db: Database session
            limit: Optional limit on number of notes to fetch

        Returns:
            List of all Note objects
        """
        query = select(Note)

        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        notes = result.scalars().all()

        logger.info(f"Found {len(notes)} total notes")
        return notes

    async def update_note_embeddings(
        self, db: AsyncSession, note_embeddings: List[tuple[str, List[float]]]
    ) -> int:
        """Update notes with their embeddings.

        Args:
            db: Database session
            note_embeddings: List of (note_id, embedding_vector) tuples

        Returns:
            Number of notes updated
        """
        updated_count = 0

        for note_id, embedding in note_embeddings:
            # Fetch the note
            result = await db.execute(select(Note).where(Note.id == note_id))
            note = result.scalars().first()

            if note:
                note.embedding = embedding
                updated_count += 1
            else:
                logger.warning(f"Note with ID {note_id} not found")

        await db.commit()
        logger.success(f"Updated {updated_count} notes with embeddings")
        return updated_count

    def prepare_text_for_embedding(self, note: Note) -> str:
        """Prepare note text for embedding generation.

        Combines title and content in a meaningful way for embedding.

        Args:
            note: Note object

        Returns:
            Prepared text string for embedding
        """
        text_parts = []

        if note.title and note.title.strip():
            text_parts.append(f"Title: {note.title.strip()}")

        if note.content and note.content.strip():
            text_parts.append(f"Content: {note.content.strip()}")

        # Add tags if available
        if note.tags:
            tags_str = ", ".join(note.tags)
            text_parts.append(f"Tags: {tags_str}")

        combined_text = "\n".join(text_parts)

        # Ensure we have some text
        if not combined_text.strip():
            logger.warning(f"Note {note.id} has no meaningful text content")
            return f"Empty note with ID: {note.id}"

        return combined_text

    async def process_notes_batch(
        self, db: AsyncSession, notes: List[Note], dry_run: bool = False
    ) -> int:
        """Process a batch of notes to generate and store embeddings.

        Args:
            db: Database session
            notes: List of notes to process
            dry_run: If True, don't actually update the database

        Returns:
            Number of notes processed
        """
        if not notes:
            logger.info("No notes to process")
            return 0

        logger.info(f"Processing {len(notes)} notes...")

        # Prepare texts for embedding
        texts = []
        note_ids = []

        for note in notes:
            text = self.prepare_text_for_embedding(note)
            texts.append(text)
            note_ids.append(str(note.id))

        # Generate embeddings
        try:
            embeddings = await self.embedding_generator.generate_embeddings(texts)
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            return 0

        if len(embeddings) != len(note_ids):
            logger.error(
                f"Embedding count mismatch: got {len(embeddings)}, expected {len(note_ids)}"
            )
            return 0

        # Update database
        if dry_run:
            logger.info(f"DRY RUN: Would update {len(note_ids)} notes with embeddings")
            return len(note_ids)
        else:
            note_embeddings = list(zip(note_ids, embeddings))
            return await self.update_note_embeddings(db, note_embeddings)


async def main():
    """Main function to run the embedding generation process."""
    parser = argparse.ArgumentParser(
        description="Generate and backfill note embeddings"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Number of notes to process in each batch (default: 100)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without actually updating the database",
    )
    parser.add_argument(
        "--force-all",
        action="store_true",
        help="Process all notes, even those with existing embeddings",
    )
    parser.add_argument(
        "--limit", type=int, help="Limit the number of notes to process"
    )

    args = parser.parse_args()

    # Load settings
    settings = get_settings()

    if not settings.OPENAI_API_KEY:
        logger.error("OPENAI_API_KEY not found in settings")
        sys.exit(1)

    # Initialize services
    embedding_generator = EmbeddingGenerator(settings.OPENAI_API_KEY)
    notes_service = NotesEmbeddingService(embedding_generator)

    logger.info("Starting embedding generation process...")
    logger.info(f"Batch size: {args.batch_size}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info(f"Force all: {args.force_all}")

    if args.limit:
        logger.info(f"Limit: {args.limit}")

    total_processed = 0

    async with AsyncSessionLocal() as db:
        try:
            # Fetch notes to process
            if args.force_all:
                notes = await notes_service.get_all_notes(db, limit=args.limit)
            else:
                notes = await notes_service.get_notes_without_embeddings(
                    db, limit=args.limit
                )

            if not notes:
                logger.info("No notes to process. All notes already have embeddings!")
                return

            # Process notes in batches
            for i in range(0, len(notes), args.batch_size):
                batch = notes[i : i + args.batch_size]
                batch_num = i // args.batch_size + 1
                total_batches = (len(notes) + args.batch_size - 1) // args.batch_size

                logger.info(f"Processing batch {batch_num}/{total_batches}...")

                processed_count = await notes_service.process_notes_batch(
                    db, batch, dry_run=args.dry_run
                )
                total_processed += processed_count

                logger.info(
                    f"Batch {batch_num} complete. Processed {processed_count} notes."
                )

        except Exception as e:
            logger.error(f"Error during embedding generation: {e}")
            sys.exit(1)

    logger.success(
        f"Embedding generation complete! Processed {total_processed} notes total."
    )


if __name__ == "__main__":
    asyncio.run(main())
