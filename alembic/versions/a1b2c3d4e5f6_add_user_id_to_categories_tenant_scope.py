"""add_user_id_to_categories_tenant_scope

Revision ID: a1b2c3d4e5f6
Revises: 7b9e5a9ad8b1
Create Date: 2026-02-08 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7b9e5a9ad8b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('user_id', sa.Uuid(), nullable=True))
    op.execute("""
        UPDATE categories c
        SET user_id = (
            SELECT lp.user_id FROM learning_projects lp
            WHERE lp.category_id = c.id LIMIT 1
        )
    """)
    op.execute("""
        UPDATE categories
        SET user_id = (SELECT id FROM users LIMIT 1)
        WHERE user_id IS NULL
    """)
    op.alter_column('categories', 'user_id', existing_type=sa.Uuid(), nullable=False)
    op.create_foreign_key('categories_user_id_fkey', 'categories', 'users', ['user_id'], ['id'])
    op.create_index('idx_categories_user_id', 'categories', ['user_id'], unique=False)
    op.create_index('idx_categories_user_id_name', 'categories', ['user_id', 'name'], unique=True)
    op.drop_index('ix_categories_name', table_name='categories')
    op.drop_index('idx_categories_name', table_name='categories')


def downgrade() -> None:
    op.drop_index('idx_categories_user_id_name', table_name='categories')
    op.drop_index('idx_categories_user_id', table_name='categories')
    op.drop_constraint('categories_user_id_fkey', 'categories', type_='foreignkey')
    op.drop_column('categories', 'user_id')
    op.create_index('idx_categories_name', 'categories', ['name'], unique=True)
