from datetime import datetime
from typing import Optional, Dict, List
from sqlmodel import Field, Relationship
from sqlalchemy import JSON, String, ARRAY, Text
from app.db.base import BaseModel
from uuid import UUID


class User(BaseModel, table=True):
    """User model for authentication and user management."""
    __tablename__ = "users"

    email: str = Field(sa_type=String(255), unique=True, index=True)
    username: str = Field(sa_type=String(50), unique=True, index=True)
    password_hash: str = Field(sa_type=String(255))
    last_login: Optional[datetime] = Field(default=None)
    is_active: bool = Field(default=True)
    preferences: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    sessions: List["Session"] = Relationship(back_populates="user")
    anki_decks: List["AnkiDeck"] = Relationship(back_populates="user")


class Session(BaseModel, table=True):
    """Session model for tracking Pomodoro sessions."""
    __tablename__ = "sessions"

    user_id: UUID = Field(foreign_key="users.id", index=True)
    start_time: datetime = Field()
    end_time: Optional[datetime] = Field(default=None)
    work_duration: int = Field()  # in minutes
    break_duration: int = Field()  # in minutes
    status: str = Field(sa_type=String(20), default="in_progress")
    category: Optional[str] = Field(sa_type=String(50), default=None)
    title: Optional[str] = Field(sa_type=String(255), default=None)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    user: User = Relationship(back_populates="sessions")
    notes: List["Note"] = Relationship(back_populates="session")


class Note(BaseModel, table=True):
    """Note model for storing session notes."""
    __tablename__ = "notes"

    session_id: UUID = Field(foreign_key="sessions.id", index=True)
    content: str = Field(sa_type=Text)
    category: Optional[str] = Field(sa_type=String(50), default=None)
    title: Optional[str] = Field(sa_type=String(255), default=None)
    tags: List[str] = Field(sa_type=ARRAY(String), default_factory=list)
    meta_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Relationships
    session: Session = Relationship(back_populates="notes")
    flashcards: List["Flashcard"] = Relationship(back_populates="note")


class Flashcard(BaseModel, table=True):
    """Flashcard model for storing learning cards."""
    __tablename__ = "flashcards"

    note_id: UUID = Field(foreign_key="notes.id", index=True)
    question: str = Field(sa_type=Text)
    answer: str = Field(sa_type=Text)
    status: str = Field(sa_type=String(20), default="draft")
    difficulty: int = Field(default=1)  # 1-5 scale
    last_reviewed: Optional[datetime] = Field(default=None)
    next_review: Optional[datetime] = Field(default=None)
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
    last_exported: Optional[datetime] = Field(default=None)
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