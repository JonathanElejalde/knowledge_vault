"""add_categories_table_and_update_relationships

Revision ID: de44002675d7
Revises: 23faacf5d6b5
Create Date: 2025-05-23 18:02:00.174739

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "de44002675d7"
down_revision: Union[str, None] = "23faacf5d6b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
