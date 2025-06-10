from datetime import datetime, date
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from uuid import UUID
import datetime as dt


class DashboardStatsResponse(BaseModel):
    """Schema for dashboard statistics response."""
    total_focus_time: int = Field(description="Total focus time in minutes")
    notes_created: int = Field(description="Number of notes created")
    active_projects: int = Field(description="Number of active projects")
    completed_projects: int = Field(description="Number of completed projects")

    class Config:
        from_attributes = True


class ProjectStatsResponse(BaseModel):
    """Schema for project statistics response."""
    project_id: UUID = Field(description="Learning project ID")
    project_name: str = Field(description="Learning project name")
    sessions_count: int = Field(description="Number of sessions for this project")
    notes_count: int = Field(description="Number of notes for this project")

    class Config:
        from_attributes = True


class DailyActivityResponse(BaseModel):
    """Schema for daily activity chart data (timezone-aware)."""
    date: dt.date = Field(description="Date of activity in user's local timezone")
    sessions_count: int = Field(description="Number of sessions on this local date")
    notes_count: int = Field(description="Number of notes created on this local date")

    class Config:
        from_attributes = True


class SessionTimeResponse(BaseModel):
    """Schema for session time chart data."""
    start_time: datetime = Field(description="Start time of the session (UTC)")
    duration: Optional[int] = Field(description="Actual duration in minutes", default=None)
    project_name: Optional[str] = Field(description="Name of the learning project", default=None)

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    """Complete dashboard response schema."""
    stats: DashboardStatsResponse = Field(description="Dashboard statistics")
    project_stats: List[ProjectStatsResponse] = Field(description="Statistics by project")
    daily_activity: List[DailyActivityResponse] = Field(description="Daily activity chart data (timezone-aware)")
    session_times: List[SessionTimeResponse] = Field(description="Session times chart data")

    class Config:
        from_attributes = True 