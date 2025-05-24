from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import Category


async def get_category_by_name(db: AsyncSession, name: str) -> Optional[Category]:
    """
    Get a category by its name.

    Args:
        db: The database session.
        name: The name of the category.

    Returns:
        The category if found, else None.
    """
    result = await db.execute(select(Category).where(Category.name == name))
    return result.scalars().first()


async def get_category_by_id(db: AsyncSession, category_id: UUID) -> Optional[Category]:
    """
    Get a category by its ID.

    Args:
        db: The database session.
        category_id: The ID of the category.

    Returns:
        The category if found, else None.
    """
    result = await db.execute(select(Category).where(Category.id == category_id))
    return result.scalars().first()


async def get_all_categories(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100
) -> List[Category]:
    """
    Get a list of all categories with pagination.

    Args:
        db: The database session.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).

    Returns:
        A list of categories.
    """
    query = select(Category).order_by(Category.name).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def create_category(db: AsyncSession, name: str, description: Optional[str] = None) -> Category:
    """
    Create a new category.

    Args:
        db: The database session.
        name: The name of the category.
        description: Optional description for the category.

    Returns:
        The created category.
    """
    category = Category(name=name, description=description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def get_or_create_category_by_name(db: AsyncSession, name: str, description: Optional[str] = None) -> Category:
    """
    Get an existing category by name or create a new one if it doesn't exist.

    Args:
        db: The database session.
        name: The name of the category.
        description: Optional description if creating a new category.

    Returns:
        The existing or newly created category.
    """
    category = await get_category_by_name(db=db, name=name)
    if not category:
        category = await create_category(db=db, name=name, description=description)
    return category 