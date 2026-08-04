"""add 'outbound_outreach' to agent_action_type enum

Revision ID: d4e5f6a7b8c9
Revises: b1a2c3d4e5f6
Create Date: 2026-08-04 00:00:00.000000

Outbound-promoted leads now get a real initial outreach message on add-to-campaign
(app/routers/outbound_leads.py) — a new AgentAction kind distinct from "replied"
(which implies responding to an inbound message; this is us reaching out first).
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'b1a2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE agent_action_type ADD VALUE IF NOT EXISTS 'outbound_outreach'")


def downgrade() -> None:
    # Postgres doesn't support removing an enum value.
    pass
