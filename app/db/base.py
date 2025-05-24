from datetime import datetime, UTC
from typing import Optional
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
import sqlalchemy as sa


class BaseModel(SQLModel):
    """Base model with common fields."""
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=sa.TIMESTAMP(timezone=True)
    )
    updated_at: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(UTC),
        sa_type=sa.TIMESTAMP(timezone=True)
    ) 