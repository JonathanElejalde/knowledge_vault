"""hash_refresh_tokens_security_fix

Revision ID: 47e9cb4ffc5b
Revises: 0d01ed839b76
Create Date: 2025-06-23 11:19:06.524778

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "47e9cb4ffc5b"
down_revision: Union[str, None] = "0d01ed839b76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - migrate from plaintext tokens to hashed tokens."""
    # First, revoke all existing refresh tokens since we can't hash plaintext tokens retroactively
    # This is a security improvement - users will need to log in again
    op.execute("UPDATE refresh_tokens SET is_revoked = true WHERE is_revoked = false")

    # Add the new token_hash column (nullable initially)
    op.add_column(
        "refresh_tokens", sa.Column("token_hash", sa.String(length=64), nullable=True)
    )

    # Create indexes for the new column
    op.create_index(
        "idx_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=False
    )
    op.create_index(
        op.f("ix_refresh_tokens_token_hash"),
        "refresh_tokens",
        ["token_hash"],
        unique=True,
    )

    # Remove old token column and its index
    op.drop_index("ix_refresh_tokens_token", table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "token")

    # Delete any rows with NULL token_hash (should be all of them since we just added the column)
    # This is safe since we already revoked all tokens above
    op.execute("DELETE FROM refresh_tokens WHERE token_hash IS NULL")

    # Now make token_hash NOT NULL since all NULL rows are removed
    op.alter_column("refresh_tokens", "token_hash", nullable=False)


def downgrade() -> None:
    """Downgrade schema - revert to plaintext tokens."""
    # WARNING: This downgrade will invalidate all refresh tokens
    # Users will need to log in again

    # Make token_hash nullable temporarily
    op.alter_column("refresh_tokens", "token_hash", nullable=True)

    # Add back the old token column (nullable initially)
    op.add_column(
        "refresh_tokens",
        sa.Column("token", sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    )

    # Revoke all existing tokens since we can't reverse the hash
    op.execute("UPDATE refresh_tokens SET is_revoked = true WHERE is_revoked = false")

    # Delete all rows since we can't populate the token column from hashes
    op.execute("DELETE FROM refresh_tokens")

    # Create index for the old column
    op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"], unique=True)

    # Remove new token_hash column and its indexes
    op.drop_index(op.f("ix_refresh_tokens_token_hash"), table_name="refresh_tokens")
    op.drop_index("idx_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "token_hash")

    # Make token NOT NULL (safe since table is empty)
    op.alter_column("refresh_tokens", "token", nullable=False)
