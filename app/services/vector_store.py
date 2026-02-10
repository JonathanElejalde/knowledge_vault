"""
Vector store abstraction layer for embedding storage and similarity search.

This module provides a unified interface for vector operations, supporting
multiple backends like PostgreSQL with pgvector and Milvus.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import openai
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.core.config import get_settings
from app.db.models import Note


class VectorStore(ABC):
    """Abstract base class for vector store implementations."""

    @abstractmethod
    async def upsert_vectors(
        self,
        vectors: List[Tuple[str, List[float]]],
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> int:
        """Insert or update vectors in the store.

        Args:
            vectors: List of (id, vector) tuples
            metadata: Optional metadata for each vector

        Returns:
            Number of vectors successfully upserted
        """
        pass

    @abstractmethod
    async def query_vectors(
        self,
        query_vector: List[float],
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Query vectors by similarity.

        Args:
            query_vector: The query vector
            limit: Maximum number of results
            filters: Optional filters to apply

        Returns:
            List of results with id, score, and metadata
        """
        pass

    @abstractmethod
    async def delete_vectors(self, ids: List[str]) -> int:
        """Delete vectors by their IDs.

        Args:
            ids: List of vector IDs to delete

        Returns:
            Number of vectors successfully deleted
        """
        pass

    @abstractmethod
    async def get_vector_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get the total number of vectors in the store.

        Args:
            filters: Optional filters to apply

        Returns:
            Total number of vectors matching the filters
        """
        pass


class PgVectorStore(VectorStore):
    """PostgreSQL with pgvector implementation of vector store."""

    def __init__(self, db_session: AsyncSession):
        """Initialize the PostgreSQL vector store.

        Args:
            db_session: Database session for PostgreSQL operations
        """
        self.db = db_session
        self.settings = get_settings()

    async def upsert_vectors(
        self,
        vectors: List[Tuple[str, List[float]]],
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> int:
        """Insert or update note embeddings in PostgreSQL.

        Args:
            vectors: List of (note_id, embedding) tuples
            metadata: Optional metadata (not used in current implementation)

        Returns:
            Number of notes successfully updated
        """
        updated_count = 0

        for note_id, embedding in vectors:
            try:
                # Find the note
                result = await self.db.execute(
                    select(Note).where(Note.id == UUID(note_id))
                )
                note = result.scalars().first()

                if note:
                    note.embedding = embedding
                    updated_count += 1
                else:
                    logger.warning(
                        f"Note with ID {note_id} not found for vector upsert"
                    )

            except Exception as e:
                logger.error(f"Failed to upsert vector for note {note_id}: {e}")

        if updated_count > 0:
            await self.db.commit()

        logger.info(f"Upserted {updated_count} vectors to PostgreSQL")
        return updated_count

    async def query_vectors(
        self,
        query_vector: List[float],
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Query note embeddings by similarity in PostgreSQL.

        Args:
            query_vector: The query embedding vector
            limit: Maximum number of results
            filters: Optional filters (user_id, learning_project_id, tags)

        Returns:
            List of results with note data and similarity scores
        """
        try:
            # Build the base query
            base_sql = """
                SELECT 
                    n.id,
                    n.title,
                    n.content,
                    n.tags,
                    n.user_id,
                    n.learning_project_id,
                    n.created_at,
                    n.updated_at,
                    n.embedding <=> :query_embedding AS similarity_distance
                FROM notes n
                WHERE n.embedding IS NOT NULL
            """

            # Build filter conditions and parameters
            filter_conditions = []
            params = {"query_embedding": str(query_vector), "limit_val": limit}

            if filters:
                if "user_id" in filters:
                    filter_conditions.append("AND n.user_id = :user_id")
                    params["user_id"] = str(filters["user_id"])

                if "learning_project_id" in filters:
                    filter_conditions.append(
                        "AND n.learning_project_id = :learning_project_id"
                    )
                    params["learning_project_id"] = str(filters["learning_project_id"])

                if "tags" in filters and filters["tags"]:
                    filter_conditions.append("AND n.tags && :tags")
                    params["tags"] = filters["tags"]

            # Combine query parts
            filter_clause = " ".join(filter_conditions)
            final_sql = f"""
                {base_sql}
                {filter_clause}
                ORDER BY similarity_distance ASC
                LIMIT :limit_val
            """

            # Execute query
            result = await self.db.execute(text(final_sql), params)
            rows = result.fetchall()

            # Convert to standardized format
            results = []
            for row in rows:
                results.append(
                    {
                        "id": str(row.id),
                        "score": float(
                            1.0 - row.similarity_distance
                        ),  # Convert distance to similarity score
                        "metadata": {
                            "title": row.title,
                            "content": row.content,
                            "tags": row.tags or [],
                            "user_id": str(row.user_id) if row.user_id else None,
                            "learning_project_id": str(row.learning_project_id)
                            if row.learning_project_id
                            else None,
                            "created_at": row.created_at.isoformat()
                            if row.created_at
                            else None,
                            "updated_at": row.updated_at.isoformat()
                            if row.updated_at
                            else None,
                        },
                    }
                )

            logger.info(f"Found {len(results)} similar vectors in PostgreSQL")
            return results

        except Exception as e:
            logger.error(f"Vector query failed in PostgreSQL: {e}")
            return []

    async def delete_vectors(self, ids: List[str]) -> int:
        """Delete note embeddings by setting them to NULL.

        Args:
            ids: List of note IDs

        Returns:
            Number of embeddings successfully cleared
        """
        deleted_count = 0

        for note_id in ids:
            try:
                result = await self.db.execute(
                    select(Note).where(Note.id == UUID(note_id))
                )
                note = result.scalars().first()

                if note and note.embedding is not None:
                    note.embedding = None
                    deleted_count += 1

            except Exception as e:
                logger.error(f"Failed to delete vector for note {note_id}: {e}")

        if deleted_count > 0:
            await self.db.commit()

        logger.info(f"Deleted {deleted_count} vectors from PostgreSQL")
        return deleted_count

    async def get_vector_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get count of notes with embeddings.

        Args:
            filters: Optional filters (user_id, learning_project_id, tags)

        Returns:
            Number of notes with embeddings
        """
        try:
            base_sql = "SELECT COUNT(*) FROM notes n WHERE n.embedding IS NOT NULL"

            filter_conditions = []
            params = {}

            if filters:
                if "user_id" in filters:
                    filter_conditions.append("AND n.user_id = :user_id")
                    params["user_id"] = str(filters["user_id"])

                if "learning_project_id" in filters:
                    filter_conditions.append(
                        "AND n.learning_project_id = :learning_project_id"
                    )
                    params["learning_project_id"] = str(filters["learning_project_id"])

                if "tags" in filters and filters["tags"]:
                    filter_conditions.append("AND n.tags && :tags")
                    params["tags"] = filters["tags"]

            filter_clause = " ".join(filter_conditions)
            final_sql = f"{base_sql} {filter_clause}"

            result = await self.db.execute(text(final_sql), params)
            count = result.scalar()

            return count or 0

        except Exception as e:
            logger.error(f"Failed to get vector count: {e}")
            return 0


class MilvusStore(VectorStore):
    """Milvus/Zilliz implementation of vector store (future implementation).

    This is a placeholder for future Milvus integration.
    When implemented, it will provide:
    - Better performance for large datasets
    - Advanced indexing options (IVF, HNSW, etc.)
    - Distributed vector search
    - Better memory management
    """

    def __init__(self, connection_params: Dict[str, Any]):
        """Initialize Milvus connection.

        Args:
            connection_params: Milvus connection parameters
        """
        self.connection_params = connection_params
        self.settings = get_settings()
        # TODO: Initialize Milvus client
        # self.client = Milvus(**connection_params)

    async def upsert_vectors(
        self,
        vectors: List[Tuple[str, List[float]]],
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> int:
        """Insert or update vectors in Milvus."""
        # TODO: Implement Milvus upsert
        # - Convert vectors to Milvus format
        # - Use collection.upsert() or collection.insert()
        # - Handle metadata storage
        raise NotImplementedError("Milvus implementation coming soon")

    async def query_vectors(
        self,
        query_vector: List[float],
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Query vectors in Milvus."""
        # TODO: Implement Milvus search
        # - Use collection.search() with appropriate metric
        # - Apply filters using boolean expressions
        # - Return results in standardized format
        raise NotImplementedError("Milvus implementation coming soon")

    async def delete_vectors(self, ids: List[str]) -> int:
        """Delete vectors from Milvus."""
        # TODO: Implement Milvus delete
        # - Use collection.delete() with entity IDs
        raise NotImplementedError("Milvus implementation coming soon")

    async def get_vector_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get vector count from Milvus."""
        # TODO: Implement Milvus count
        # - Use collection.query() with count expression
        raise NotImplementedError("Milvus implementation coming soon")


class VectorStoreFactory:
    """Factory for creating vector store instances."""

    @staticmethod
    def create_vector_store(
        backend: str,
        db_session: Optional[AsyncSession] = None,
        connection_params: Optional[Dict[str, Any]] = None,
    ) -> VectorStore:
        """Create a vector store instance based on the backend type.

        Args:
            backend: Vector store backend ("pg" or "milvus")
            db_session: Database session (required for PostgreSQL)
            connection_params: Connection parameters (required for Milvus)

        Returns:
            Vector store instance

        Raises:
            ValueError: If invalid backend or missing parameters
        """
        backend = backend.lower()

        if backend == "pg" or backend == "postgresql":
            if not db_session:
                raise ValueError("db_session is required for PostgreSQL backend")
            return PgVectorStore(db_session)

        elif backend == "milvus" or backend == "zilliz":
            if not connection_params:
                raise ValueError("connection_params is required for Milvus backend")
            return MilvusStore(connection_params)

        else:
            raise ValueError(f"Unsupported vector store backend: {backend}")


# Convenience functions for common operations
async def get_default_vector_store(db_session: AsyncSession) -> VectorStore:
    """Get the default vector store instance.

    Args:
        db_session: Database session

    Returns:
        Default vector store instance based on settings
    """
    settings = get_settings()
    return VectorStoreFactory.create_vector_store(
        backend=settings.VECTOR_BACKEND, db_session=db_session
    )


async def generate_query_embedding(query_text: str) -> Optional[List[float]]:
    """Generate embedding for a search query.

    Args:
        query_text: The search query text

    Returns:
        Embedding vector or None if generation fails
    """
    try:
        settings = get_settings()
        if not settings.OPENAI_API_KEY:
            logger.warning("OPENAI_API_KEY not configured")
            return None

        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=[query_text.strip()],
            encoding_format="float",
        )

        return response.data[0].embedding

    except Exception as e:
        logger.error(f"Failed to generate query embedding: {e}")
        return None
