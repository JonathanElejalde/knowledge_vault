from datetime import datetime
from typing import Optional, Dict
from uuid import UUID
from pydantic import BaseModel, Field

class SessionResponseBase(BaseModel):
    """Base schema for Pomodoro session response."""
    id: UUID
    user_id: UUID
    learning_project_id: Optional[UUID]
    start_time: datetime
    end_time: Optional[datetime]
    work_duration: int
    break_duration: int
    actual_duration: Optional[int]
    session_type: str
    status: str
    title: Optional[str]
    meta_data: Dict

    class Config:
        from_attributes = True

class LearningProjectResponseBase(BaseModel):
    """Base schema for learning project response."""
    id: UUID
    user_id: UUID
    name: str
    category: Optional[str]
    description: Optional[str]
    status: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True 