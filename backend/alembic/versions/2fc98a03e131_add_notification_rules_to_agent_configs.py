"""add notification_rules to agent_configs

Revision ID: 2fc98a03e131
Revises: 215dc4d5907a
Create Date: 2026-07-24 23:12:50.698062

Trimmed by hand from the raw --autogenerate output, which also picked up a large
batch of pre-existing drift (nullable/index/constraint-name differences) between the
initial migration and the models — unrelated to this change and out of scope here.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2fc98a03e131'
down_revision: Union[str, None] = '215dc4d5907a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'agent_configs',
        sa.Column('notification_rules', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
    )
    op.alter_column('agent_configs', 'notification_rules', server_default=None)


def downgrade() -> None:
    op.drop_column('agent_configs', 'notification_rules')
