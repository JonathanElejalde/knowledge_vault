from typing import Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Category


async def get_category_by_name(
    db: AsyncSession, user_id: UUID, name: str
) -> Optional[Category]:
    """
    Get a category by name for the given user.

    Args:
        db: The database session.
        user_id: The owner's user id.
        name: The name of the category.

    Returns:
        The category if found, else None.
    """
    result = await db.execute(
        select(Category).where(Category.user_id == user_id, Category.name == name)
    )
    return result.scalars().first()


async def get_category_by_id(
    db: AsyncSession, category_id: UUID, user_id: UUID
) -> Optional[Category]:
    """
    Get a category by ID if it belongs to the given user.

    Args:
        db: The database session.
        category_id: The ID of the category.
        user_id: The owner's user id.

    Returns:
        The category if found and owned by user, else None.
    """
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    return result.scalars().first()


async def get_all_categories(
    db: AsyncSession, user_id: UUID, skip: int = 0, limit: int = 100
) -> List[Category]:
    """
    Get all categories for the given user with pagination.

    Args:
        db: The database session.
        user_id: The owner's user id.
        skip: Number of records to skip (for pagination).
        limit: Maximum number of records to return (for pagination).

    Returns:
        A list of categories.
    """
    query = (
        select(Category)
        .where(Category.user_id == user_id)
        .order_by(Category.name)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_category(
    db: AsyncSession, user_id: UUID, name: str, description: Optional[str] = None
) -> Category:
    """
    Create a new category for the given user.

    Args:
        db: The database session.
        user_id: The owner's user id.
        name: The name of the category.
        description: Optional description for the category.

    Returns:
        The created category.
    """
    category = Category(user_id=user_id, name=name, description=description)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def get_or_create_category_by_name(
    db: AsyncSession, user_id: UUID, name: str, description: Optional[str] = None
) -> Category:
    """
    Get an existing category by name for the user, or create it if it doesn't exist.

    Args:
        db: The database session.
        user_id: The owner's user id.
        name: The name of the category.
        description: Optional description if creating a new category.

    Returns:
        The existing or newly created category.
    """
    category = await get_category_by_name(db=db, user_id=user_id, name=name)
    if not category:
        category = await create_category(
            db=db, user_id=user_id, name=name, description=description
        )
    return category
