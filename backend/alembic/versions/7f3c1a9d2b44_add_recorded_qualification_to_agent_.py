"""add recorded_qualification to agent_action_type enum

Revision ID: 7f3c1a9d2b44
Revises: 2aa87e723069
Create Date: 2026-07-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f3c1a9d2b44'
down_revision: Union[str, None] = '2aa87e723069'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE agent_action_type ADD VALUE IF NOT EXISTS 'recorded_qualification'")


def downgrade() -> None:
    pass  # Postgres doesn't support removing an enum value
