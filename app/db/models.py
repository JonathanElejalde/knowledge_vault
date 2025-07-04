from datetime import datetime
from typing import Optional, Dict, List
from sqlmodel import Field, Relationship
from sqlalchemy import JSON, String, ARRAY, Text, Index
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa
from app.db.base import BaseModel
from uuid import UUID


class User(BaseModel, table=True):
    """User model for authentication and user management."""
    __tablename__ = "users"

    email: str = Field(sa_type=String(255), unique=True, index=True)
    username: str = Field(sa_type=String(50), unique=True, index=True)
    password_hash: str = Field(sa_type=String(255))
    last_login: Optional[datetime] = Field(default=None, sa_type=sa.TIMESTAMP(timezone=True))
    is_active: bool = Field(default=True)
    preferences: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    sessions: List["Session"] = Relationship(back_populates="user")
    anki_decks: List["AnkiDeck"] = Relationship(back_populates="user")
    learning_projects: List["LearningProject"] = Relationship(back_populates="user")
    notes: List["Note"] = Relationship(back_populates="user")
    refresh_tokens: List["RefreshToken"] = Relationship(back_populates="user")


class Category(BaseModel, table=True):
    """Category model for organizing learning projects."""
    __tablename__ = "categories"
    __table_args__ = (
        Index('idx_categories_name', 'name'),
    )

    name: str = Field(sa_type=String(100), unique=True, index=True)
    description: Optional[str] = Field(sa_type=Text, default=None)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    learning_projects: List["LearningProject"] = Relationship(back_populates="category")


class LearningProject(BaseModel, table=True):
    """LearningProject model for organizing learning sessions."""
    __tablename__ = "learning_projects"
    __table_args__ = (
        Index('idx_learning_projects_category_id', 'category_id'),
        Index('idx_learning_projects_status', 'status'),
    )

    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(sa_type=String(255))
    category_id: Optional[UUID] = Field(foreign_key="categories.id", index=True, default=None)
    status: str = Field(sa_type=String(50), default="in_progress")
    description: Optional[str] = Field(sa_type=Text, default=None)

    # Relationships
    user: User = Relationship(back_populates="learning_projects")
    sessions: List["Session"] = Relationship(back_populates="learning_project")
    notes: List["Note"] = Relationship(back_populates="learning_project")
    category: Optional["Category"] = Relationship(back_populates="learning_projects")


class Session(BaseModel, table=True):
    """Session model for tracking Pomodoro sessions."""
    __tablename__ = "sessions"
    __table_args__ = (
        Index('idx_sessions_start_time', 'start_time'),
        Index('idx_sessions_learning_project_id', 'learning_project_id'),
    )

    user_id: UUID = Field(foreign_key="users.id", index=True)
    learning_project_id: Optional[UUID] = Field(foreign_key="learning_projects.id", index=True, default=None)
    start_time: datetime = Field(sa_type=sa.TIMESTAMP(timezone=True))
    end_time: Optional[datetime] = Field(default=None, sa_type=sa.TIMESTAMP(timezone=True))
    work_duration: int = Field()  # in minutes
    break_duration: int = Field()  # in minutes
    actual_duration: Optional[int] = Field(default=None)  # in minutes
    session_type: str = Field(sa_type=String(20), default="work")
    status: str = Field(sa_type=String(20), default="in_progress")
    title: Optional[str] = Field(sa_type=String(255), default=None)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    user: User = Relationship(back_populates="sessions")
    learning_project: Optional[LearningProject] = Relationship(back_populates="sessions")
    notes: List["Note"] = Relationship(back_populates="session")


class Note(BaseModel, table=True):
    """Note model for storing session notes."""
    __tablename__ = "notes"
    __table_args__ = (
        Index('idx_notes_tags', 'tags', postgresql_using='gin'),
        Index('idx_notes_embedding_hnsw', 'embedding', postgresql_using='hnsw', postgresql_with={'m': 16, 'ef_construction': 64}, postgresql_ops={'embedding': 'vector_cosine_ops'}),
    )

    user_id: Optional[UUID] = Field(foreign_key="users.id", index=True, default=None)
    session_id: Optional[UUID] = Field(foreign_key="sessions.id", index=True, default=None)
    learning_project_id: Optional[UUID] = Field(foreign_key="learning_projects.id", index=True, default=None)
    content: str = Field(sa_type=Text)
    title: Optional[str] = Field(sa_type=String(255), default=None)
    tags: List[str] = Field(sa_type=ARRAY(String), default_factory=list)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)
    embedding: Optional[List[float]] = Field(sa_type=Vector(1536), default=None)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="notes")
    session: Optional[Session] = Relationship(back_populates="notes")
    learning_project: Optional[LearningProject] = Relationship(back_populates="notes")
    flashcards: List["Flashcard"] = Relationship(back_populates="note")


class Flashcard(BaseModel, table=True):
    """Flashcard model for storing learning cards."""
    __tablename__ = "flashcards"
    __table_args__ = (
        Index('idx_flashcards_status', 'status'),
        Index('idx_flashcards_next_review', 'next_review'),
    )

    note_id: UUID = Field(foreign_key="notes.id", index=True)
    question: str = Field(sa_type=Text)
    answer: str = Field(sa_type=Text)
    status: str = Field(sa_type=String(20), default="draft")
    difficulty: int = Field(default=1)  # 1-5 scale
    last_reviewed: Optional[datetime] = Field(default=None, sa_type=sa.TIMESTAMP(timezone=True))
    next_review: Optional[datetime] = Field(default=None, sa_type=sa.TIMESTAMP(timezone=True))
    review_count: int = Field(default=0)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    note: Note = Relationship(back_populates="flashcards")
    anki_deck_flashcards: List["AnkiDeckFlashcard"] = Relationship(back_populates="flashcard")


class AnkiDeck(BaseModel, table=True):
    """AnkiDeck model for managing Anki export decks."""
    __tablename__ = "anki_decks"

    user_id: UUID = Field(foreign_key="users.id", index=True)
    name: str = Field(sa_type=String(255))
    description: Optional[str] = Field(sa_type=Text, default=None)
    last_exported: Optional[datetime] = Field(default=None, sa_type=sa.TIMESTAMP(timezone=True))
    export_settings: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    user: User = Relationship(back_populates="anki_decks")
    anki_deck_flashcards: List["AnkiDeckFlashcard"] = Relationship(back_populates="deck")


class AnkiDeckFlashcard(BaseModel, table=True):
    """Junction table for AnkiDeck and Flashcard many-to-many relationship."""
    __tablename__ = "anki_deck_flashcards"

    deck_id: UUID = Field(foreign_key="anki_decks.id", index=True)
    flashcard_id: UUID = Field(foreign_key="flashcards.id", index=True)

    # Relationships
    deck: AnkiDeck = Relationship(back_populates="anki_deck_flashcards")
    flashcard: Flashcard = Relationship(back_populates="anki_deck_flashcards")


class RefreshToken(BaseModel, table=True):
    """Refresh token model for managing long-lived refresh tokens."""
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        Index('idx_refresh_tokens_user_id', 'user_id'),
        Index('idx_refresh_tokens_expires_at', 'expires_at'),
        Index('idx_refresh_tokens_token_hash', 'token_hash'),  # Index on hash for fast lookups
    )

    user_id: UUID = Field(foreign_key="users.id", index=True)
    token_hash: str = Field(sa_type=String(64), unique=True, index=True)  # SHA-256 hash (64 chars)
    expires_at: datetime = Field(sa_type=sa.TIMESTAMP(timezone=True))
    is_revoked: bool = Field(default=False)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    user: User = Relationship(back_populates="refresh_tokens") 