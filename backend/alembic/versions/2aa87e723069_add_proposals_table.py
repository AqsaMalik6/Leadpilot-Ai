"""add proposals table

Revision ID: 2aa87e723069
Revises: 0b195900d51e
Create Date: 2026-07-26 20:07:58.297202

Digital FTE upgrade — post-meeting flow: adds the `proposals` table backing the
generate -> manager-approve -> send -> pipeline_stage=proposal_sent flow. Trimmed by
hand down from autogenerate's output, which also picked up a large batch of unrelated
pre-existing nullable/index/constraint-name drift on ~15 other tables (same pattern
seen in every prior migration in this project) — none of that is part of this change.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2aa87e723069'
down_revision: Union[str, None] = '0b195900d51e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'proposals',
        sa.Column('lead_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('subject', sa.Text(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('draft', 'approved', 'sent', name='proposal_status'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('lead_id'),
    )


def downgrade() -> None:
    op.drop_table('proposals')
