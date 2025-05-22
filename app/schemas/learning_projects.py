from datetime import datetime
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel, Field

from .pomodoro import SessionResponse

class LearningProjectBase(BaseModel):
    """Base schema for learning project."""
    name: str = Field(max_length=255)
    category: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)


class LearningProjectCreate(LearningProjectBase):
    """Schema for creating a new learning project."""
    pass


class LearningProjectUpdate(LearningProjectBase):
    """Schema for updating an existing learning project."""
    name: Optional[str] = Field(default=None, max_length=255)
    status: Optional[str] = Field(default=None, max_length=50, pattern="^(in_progress|completed|on_hold|abandoned|archived)$")


class LearningProjectResponse(LearningProjectBase):
    """Schema for learning project response."""
    id: UUID
    user_id: UUID
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class LearningProjectDetailResponse(LearningProjectResponse):
    """Schema for detailed learning project response, including its sessions."""
    sessions: List[SessionResponse] = [] # This will now use the imported SessionResponse

    class Config:
        from_attributes = True 