"""digital fte upgrade: pipeline stage, agent actions, gmail accounts

Revision ID: 9d70c62adc90
Revises: 2fc98a03e131
Create Date: 2026-07-25 16:13:01.141943

Trimmed by hand from the raw --autogenerate output (same pre-existing drift noise as
2fc98a03e131 — unrelated nullable/index/constraint-name differences, out of scope here).
Also adds server_default values on the new NOT NULL `leads` columns (autogenerate
omitted them, which would fail against the existing rows from this session's testing)
and the raw ALTER TYPE ADD VALUE statements for 'gmail' that autogenerate can't detect
on existing enum types at all.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9d70c62adc90'
down_revision: Union[str, None] = '2fc98a03e131'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- SKILL-DIGITAL-FTE-UPGRADE.md §1: add 'gmail' to the three existing channel enums ---
    op.execute("ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'gmail'")
    op.execute("ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'gmail'")
    op.execute("ALTER TYPE message_channel ADD VALUE IF NOT EXISTS 'gmail'")

    # --- new tables ---
    op.create_table(
        'gmail_accounts',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('email_address', sa.String(length=320), nullable=False),
        sa.Column('oauth_tokens_encrypted', sa.LargeBinary(), nullable=False),
        sa.Column('last_history_id', sa.Text(), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'agent_actions',
        sa.Column('lead_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column(
            'action_type',
            sa.Enum(
                'replied', 'followed_up', 'marked_cold', 'scheduled_meeting', 'classified_temperature',
                'notified_owner', 'updated_pipeline_stage', 'manual_override', name='agent_action_type',
            ),
            nullable=False,
        ),
        sa.Column('reasoning', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- conversations.memory_summary ---
    op.add_column('conversations', sa.Column('memory_summary', sa.Text(), nullable=True))

    # --- leads: new pipeline/follow-up columns, with server defaults for existing rows ---
    # op.add_column (unlike op.create_table) doesn't fire the automatic CREATE TYPE DDL
    # event for a new sa.Enum, so the two new Postgres enum types are created explicitly
    # first, then referenced with create_type=False to avoid a double-create conflict.
    pipeline_stage_enum = postgresql.ENUM(
        'new', 'contacted', 'qualified', 'meeting_scheduled', 'proposal_sent', 'won', 'lost', name='pipeline_stage'
    )
    lead_temperature_enum = postgresql.ENUM('hot', 'warm', 'cold', name='lead_temperature')
    pipeline_stage_enum.create(op.get_bind(), checkfirst=True)
    lead_temperature_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'leads',
        sa.Column(
            'pipeline_stage',
            postgresql.ENUM('new', 'contacted', 'qualified', 'meeting_scheduled', 'proposal_sent', 'won', 'lost', name='pipeline_stage', create_type=False),
            server_default='new',
            nullable=False,
        ),
    )
    op.add_column(
        'leads',
        sa.Column(
            'temperature',
            postgresql.ENUM('hot', 'warm', 'cold', name='lead_temperature', create_type=False),
            server_default='warm',
            nullable=False,
        ),
    )
    op.add_column('leads', sa.Column('last_inbound_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_outbound_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('follow_up_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('leads', sa.Column('next_follow_up_at', sa.DateTime(timezone=True), nullable=True))

    # Backfill pipeline_stage for rows that already have a status from before this
    # migration, so existing qualified/booked/rejected test leads aren't stuck at "new".
    op.execute("UPDATE leads SET pipeline_stage = 'qualified' WHERE status = 'qualified'")
    op.execute("UPDATE leads SET pipeline_stage = 'meeting_scheduled' WHERE status = 'booked'")
    op.execute("UPDATE leads SET pipeline_stage = 'lost' WHERE status = 'rejected'")


def downgrade() -> None:
    op.drop_column('leads', 'next_follow_up_at')
    op.drop_column('leads', 'follow_up_count')
    op.drop_column('leads', 'last_outbound_at')
    op.drop_column('leads', 'last_inbound_at')
    op.drop_column('leads', 'temperature')
    op.drop_column('leads', 'pipeline_stage')
    op.drop_column('conversations', 'memory_summary')
    op.drop_table('agent_actions')
    op.drop_table('gmail_accounts')
    # Postgres doesn't support removing a value from an enum type — 'gmail' stays in
    # channel_type/lead_source/message_channel on downgrade.
