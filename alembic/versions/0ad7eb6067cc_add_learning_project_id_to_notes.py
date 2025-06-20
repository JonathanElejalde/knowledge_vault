"""add learning_project_id to notes

Revision ID: 0ad7eb6067cc
Revises: 1daacdd0c788
Create Date: 2025-05-23 17:51:43.458934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ad7eb6067cc'
down_revision: Union[str, None] = '1daacdd0c788'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('notes', sa.Column('learning_project_id', sa.Uuid(), nullable=True))
    op.alter_column('notes', 'session_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.create_index(op.f('ix_notes_learning_project_id'), 'notes', ['learning_project_id'], unique=False)
    op.create_foreign_key(None, 'notes', 'learning_projects', ['learning_project_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'notes', type_='foreignkey')
    op.drop_index(op.f('ix_notes_learning_project_id'), table_name='notes')
    op.alter_column('notes', 'session_id',
               existing_type=sa.UUID(),
               nullable=False)
    op.drop_column('notes', 'learning_project_id')
    # ### end Alembic commands ###
