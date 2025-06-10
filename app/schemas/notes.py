from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    """Base schema for note."""
    content: str = Field(min_length=1, description="The content of the note")
    title: Optional[str] = Field(default=None, max_length=255, description="Optional title for the note")
    tags: List[str] = Field(default_factory=list, description="List of tags for the note")
    meta_data: Dict = Field(default_factory=dict, description="Additional metadata for the note")


class NoteCreate(NoteBase):
    """Schema for creating a new note."""
    learning_project_id: Optional[UUID] = Field(default=None, description="Optional learning project ID to associate the note with")


class NoteUpdate(BaseModel):
    """Schema for updating an existing note."""
    content: Optional[str] = Field(default=None, min_length=1, description="The content of the note")
    title: Optional[str] = Field(default=None, max_length=255, description="Optional title for the note")
    tags: Optional[List[str]] = Field(default=None, description="List of tags for the note")
    meta_data: Optional[Dict] = Field(default=None, description="Additional metadata for the note")
    learning_project_id: Optional[UUID] = Field(default=None, description="Optional learning project ID to associate the note with")


class NoteResponse(BaseModel):
    """Schema for note response."""
    id: UUID
    user_id: Optional[UUID]
    learning_project_id: Optional[UUID]
    content: str
    title: Optional[str]
    tags: List[str]
    meta_data: Dict
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class NoteDetailResponse(NoteResponse):
    """Schema for detailed note response, including related data."""
    learning_project_name: Optional[str] = Field(default=None, description="Name of the associated learning project")
    similarity_score: Optional[float] = Field(default=None, description="Similarity score for semantic search results (0.0-1.0, higher is more similar)")

    class Config:
        from_attributes = True
