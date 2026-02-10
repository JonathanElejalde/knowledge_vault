from datetime import datetime
from typing import List, Optional
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
    sessions_count: int = Field(description="Number of completed sessions on this local date")
    abandoned_sessions_count: int = Field(description="Number of abandoned sessions on this local date")
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


class FocusHeatmapCell(BaseModel):
    """Schema for a single cell in the focus heatmap."""
    day_of_week: int = Field(description="Day of week (0=Monday, 6=Sunday)", ge=0, le=6)
    hour: int = Field(description="Hour of day (0-23)", ge=0, le=23)
    total_minutes: int = Field(description="Total focus minutes in this slot", ge=0)
    session_count: int = Field(description="Number of sessions in this slot", ge=0)

    class Config:
        from_attributes = True


class FocusHeatmapResponse(BaseModel):
    """Schema for focus heatmap data aggregated by day-of-week and hour."""
    cells: List[FocusHeatmapCell] = Field(description="Heatmap cells with aggregated focus data")
    max_minutes: int = Field(description="Maximum minutes in any cell (for normalization)", ge=0)

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    """Complete dashboard response schema."""
    stats: DashboardStatsResponse = Field(description="Dashboard statistics")
    project_stats: List[ProjectStatsResponse] = Field(description="Statistics by project")
    daily_activity: List[DailyActivityResponse] = Field(description="Daily activity chart data (timezone-aware)")
    session_times: List[SessionTimeResponse] = Field(description="Session times chart data")
    focus_heatmap: FocusHeatmapResponse = Field(description="Focus heatmap aggregated by day-of-week and hour")

    class Config:
        from_attributes = True 