"""update created_at and updated_at

Revision ID: cb1197a3b50d
Revises: 21a78b3eead7
Create Date: 2025-05-21 17:34:41.642047

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "cb1197a3b50d"
down_revision: Union[str, None] = "21a78b3eead7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
