from datetime import datetime
from typing import Optional, Dict
from uuid import UUID
from pydantic import BaseModel, Field


class PomodoroPreferences(BaseModel):
    """Schema for Pomodoro timer preferences."""
    work_duration: int = Field(default=25, ge=1, le=60, description="Work duration in minutes")
    break_duration: int = Field(default=5, ge=1, le=30, description="Short break duration in minutes")
    long_break_duration: int = Field(default=15, ge=1, le=60, description="Long break duration in minutes")
    long_break_interval: int = Field(default=4, ge=1, le=10, description="Number of work sessions before a long break")


class SessionStart(BaseModel):
    """Schema for starting a new Pomodoro session."""
    learning_project_id: Optional[UUID] = Field(default=None, description="Optional learning project ID")
    session_type: str = Field(default="work", pattern="^(work|break)$", description="Type of session: work or break")
    work_duration: int = Field(ge=1, le=60, description="Work duration in minutes")
    break_duration: int = Field(ge=1, le=30, description="Break duration in minutes")


class SessionComplete(BaseModel):
    """Schema for completing a Pomodoro session."""
    actual_duration: Optional[int] = Field(default=None, ge=1, description="Actual duration in minutes")


class SessionAbandon(BaseModel):
    """Schema for abandoning a Pomodoro session."""
    actual_duration: Optional[int] = Field(default=None, ge=1, description="Duration before abandoning in minutes")
    reason: Optional[str] = Field(default=None, max_length=255, description="Reason for abandoning the session")


class SessionResponse(BaseModel):
    """Schema for Pomodoro session response."""
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
    category: Optional[str]
    title: Optional[str]
    meta_data: Dict

    class Config:
        from_attributes = True 
    