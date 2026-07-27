"""add lead_cold to notification_type enum

Revision ID: 0b195900d51e
Revises: 9d70c62adc90
Create Date: 2026-07-25 16:21:06.045451

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b195900d51e'
down_revision: Union[str, None] = '9d70c62adc90'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'lead_cold'")


def downgrade() -> None:
    pass  # Postgres doesn't support removing an enum value
