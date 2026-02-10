"""enforce_single_active_session_per_user

Revision ID: 7b9e5a9ad8b1
Revises: 47e9cb4ffc5b
Create Date: 2026-02-07 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7b9e5a9ad8b1"
down_revision: Union[str, None] = "47e9cb4ffc5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Ensure existing data satisfies the upcoming unique partial index.
    # Keep the newest in-progress session per user, mark older ones abandoned.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id
                    ORDER BY start_time DESC, created_at DESC, id DESC
                ) AS rn
            FROM sessions
            WHERE status = 'in_progress'
        )
        UPDATE sessions s
        SET
            status = 'abandoned',
            end_time = COALESCE(s.end_time, NOW())
        FROM ranked r
        WHERE s.id = r.id AND r.rn > 1
        """
    )

    op.create_index(
        "uq_sessions_user_in_progress",
        "sessions",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("status = 'in_progress'"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("uq_sessions_user_in_progress", table_name="sessions")
