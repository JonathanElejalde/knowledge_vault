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


class WeeklyStatisticsResponse(BaseModel):
    """Schema for weekly Pomodoro statistics response."""
    total_focus_time_minutes: int = Field(description="Total focus time in minutes for the current week (completed and abandoned sessions)")
    completed_sessions_count: int = Field(description="Number of completed sessions in the current week")
    abandoned_sessions_count: int = Field(description="Number of abandoned sessions in the current week")
    notes_count: int = Field(description="Number of notes taken in the current week")
    week_start_date: datetime = Field(description="Start date of the current week (Monday)")
    week_end_date: datetime = Field(description="End date of the current week (Sunday)")

    class Config:
        from_attributes = True


class SessionSummaryResponse(BaseModel):
    """Schema for Pomodoro session summary response."""
    project_id: Optional[UUID] = Field(default=None, description="The unique ID of the project (nullable if session not linked to a project)")
    project_name: str = Field(description="The name of the project (or 'No Project' if not linked)")
    total_duration_minutes: int = Field(description="Sum of all session durations (in minutes) for this project in the period")
    first_session_date: datetime = Field(description="The datetime of the earliest session for this project in the period")
    last_session_date: datetime = Field(description="The datetime of the latest session for this project in the period")
    session_count: int = Field(description="Number of sessions for this project in the period")

    class Config:
        from_attributes = True 
    