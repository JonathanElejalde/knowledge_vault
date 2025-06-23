from typing import Annotated, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user, general_rate_limit
from app.db.models import User
from app.db.session import get_db
from app.crud import categories as crud_categories
from app.schemas.categories import (
    CategoryResponse
)

router = APIRouter(
    tags=["Categories"],
    dependencies=[general_rate_limit]  # Apply rate limiting to all category endpoints
)


@router.get("/", response_model=List[CategoryResponse])
async def list_categories(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
) -> List[CategoryResponse]:
    """List all categories in the system with optional pagination.

    Args:
        current_user: The authenticated user.
        db: The database session.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).

    Returns:
        A list of categories ordered by name.
    """
    categories = await crud_categories.get_all_categories(
        db=db,
        skip=skip,
        limit=limit
    )
    return [CategoryResponse.model_validate(category) for category in categories] 