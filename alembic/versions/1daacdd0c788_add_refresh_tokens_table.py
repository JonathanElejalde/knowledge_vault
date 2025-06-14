"""add refresh tokens table

Revision ID: 1daacdd0c788
Revises: cb1197a3b50d
Create Date: 2025-05-23 11:30:54.196190

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1daacdd0c788'
down_revision: Union[str, None] = 'cb1197a3b50d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('refresh_tokens',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=True),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('token', sa.String(length=255), nullable=False),
    sa.Column('expires_at', sa.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('is_revoked', sa.Boolean(), nullable=False),
    sa.Column('meta_data', sa.JSON(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'], unique=False)
    op.create_index('idx_refresh_tokens_user_id', 'refresh_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token'), 'refresh_tokens', ['token'], unique=True)
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.alter_column('anki_deck_flashcards', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('anki_deck_flashcards', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('anki_decks', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('anki_decks', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('anki_decks', 'last_exported',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('flashcards', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('flashcards', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('flashcards', 'last_reviewed',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('flashcards', 'next_review',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('learning_projects', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('learning_projects', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('notes', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('notes', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('sessions', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('sessions', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('sessions', 'start_time',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('sessions', 'end_time',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.drop_column('sessions', 'category')
    op.alter_column('users', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=False)
    op.alter_column('users', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    op.alter_column('users', 'last_login',
               existing_type=postgresql.TIMESTAMP(),
               type_=sa.TIMESTAMP(timezone=True),
               existing_nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('users', 'last_login',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('users', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('users', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.add_column('sessions', sa.Column('category', sa.VARCHAR(length=50), autoincrement=False, nullable=True))
    op.alter_column('sessions', 'end_time',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('sessions', 'start_time',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.alter_column('sessions', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('sessions', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.alter_column('notes', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('notes', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.alter_column('learning_projects', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('learning_projects', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.alter_column('flashcards', 'next_review',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('flashcards', 'last_reviewed',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('flashcards', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('flashcards', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.alter_column('anki_decks', 'last_exported',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('anki_decks', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('anki_decks', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.alter_column('anki_deck_flashcards', 'updated_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('anki_deck_flashcards', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=False)
    op.drop_index(op.f('ix_refresh_tokens_user_id'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_token'), table_name='refresh_tokens')
    op.drop_index('idx_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_index('idx_refresh_tokens_expires_at', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    # ### end Alembic commands ###
