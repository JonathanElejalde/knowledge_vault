from typing import Optional, List
from pydantic import BaseModel, Field

from .shared import LearningProjectResponseBase, SessionResponseBase

class LearningProjectBase(BaseModel):
    """Base schema for learning project."""
    name: str = Field(max_length=255)
    category_name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)


class LearningProjectCreate(LearningProjectBase):
    """Schema for creating a new learning project."""
    pass


class LearningProjectUpdate(BaseModel):
    """Schema for updating an existing learning project."""
    name: Optional[str] = Field(default=None, max_length=255)
    category_name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None, max_length=50, pattern="^(in_progress|completed|on_hold|abandoned|archived)$")


class LearningProjectResponse(LearningProjectResponseBase):
    """Schema for learning project response."""
    pass


class LearningProjectDetailResponse(LearningProjectResponse):
    """Schema for detailed learning project response, including its sessions."""
    sessions: List[SessionResponseBase] = []

    class Config:
        from_attributes = True 