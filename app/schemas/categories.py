from datetime import datetime
from typing import Optional, Dict
from uuid import UUID
from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    """Base schema for category."""
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None)


class CategoryCreate(CategoryBase):
    """Schema for creating a new category."""
    pass


class CategoryUpdate(BaseModel):
    """Schema for updating an existing category."""
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None)


class CategoryResponse(BaseModel):
    """Schema for category response."""
    id: UUID
    name: str
    description: Optional[str]
    meta_data: Dict
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True 