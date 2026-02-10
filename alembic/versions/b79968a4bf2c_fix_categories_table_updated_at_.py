"""fix_categories_table_updated_at_constraint

Revision ID: b79968a4bf2c
Revises: de44002675d7
Create Date: 2025-05-23 18:47:13.867890

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b79968a4bf2c"
down_revision: Union[str, None] = "de44002675d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # First, drop the foreign key constraint from learning_projects
    op.drop_constraint(
        "learning_projects_category_id_fkey", "learning_projects", type_="foreignkey"
    )

    # Now drop the existing categories table
    op.drop_table("categories")

    # Recreate the categories table with the correct schema
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column(
            "updated_at", sa.TIMESTAMP(timezone=True), nullable=True
        ),  # This should be nullable
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("meta_data", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Recreate indexes
    op.create_index("idx_categories_name", "categories", ["name"], unique=True)

    # Recreate the foreign key constraint
    op.create_foreign_key(
        "learning_projects_category_id_fkey",
        "learning_projects",
        "categories",
        ["category_id"],
        ["id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # First, drop the foreign key constraint from learning_projects
    op.drop_constraint(
        "learning_projects_category_id_fkey", "learning_projects", type_="foreignkey"
    )

    # Drop the corrected table
    op.drop_table("categories")

    # Recreate the old table with the incorrect schema (for rollback purposes)
    op.create_table(
        "categories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),  # This was the problematic constraint
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("meta_data", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Recreate indexes
    op.create_index("idx_categories_name", "categories", ["name"], unique=True)

    # Recreate the foreign key constraint
    op.create_foreign_key(
        "learning_projects_category_id_fkey",
        "learning_projects",
        "categories",
        ["category_id"],
        ["id"],
    )
