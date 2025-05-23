from datetime import datetime
from typing import Optional, Dict, List
from uuid import UUID
from pydantic import BaseModel, Field

from .shared import SessionResponseBase, LearningProjectResponseBase


class PomodoroPreferences(BaseModel):
    """Schema for Pomodoro timer preferences."""
    work_duration: int = Field(default=25, ge=1, le=60, description="Work duration in minutes")
    break_duration: int = Field(default=5, ge=1, le=30, description="Short break duration in minutes")
    long_break_duration: int = Field(default=15, ge=1, le=60, description="Long break duration in minutes")
    long_break_interval: int = Field(default=4, ge=1, le=10, description="Number of work sessions before a long break")


class SessionStart(BaseModel):
    """Schema for starting a new Pomodoro session."""
    learning_project_id: Optional[UUID] = Field(default=None, description="Optional learning project ID")
    title: Optional[str] = Field(default=None, max_length=255, description="Title of the Pomodoro session")
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


class SessionResponse(SessionResponseBase):
    """Schema for Pomodoro session response."""
    pass


class SessionResponseWithProject(SessionResponse):
    """Schema for Pomodoro session response including learning project details."""
    learning_project: Optional[LearningProjectResponseBase] = None 
    