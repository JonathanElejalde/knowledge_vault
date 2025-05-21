"""update_datetime_fields_to_support_timezone

Revision ID: 21a78b3eead7
Revises: 119bc53d93a1
Create Date: 2025-05-21 15:42:59.379936

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '21a78b3eead7'
down_revision: Union[str, None] = '119bc53d93a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
