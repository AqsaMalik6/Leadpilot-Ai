"""add calendly gmail-detection + meeting transcript/scheduling fields

Revision ID: c5c4823e4dc2
Revises: 698c208411e8
Create Date: 2026-07-30 00:00:00.000000

Real Calendly-booking detection via Gmail (no public webhook URL available on
localhost): leads.meeting_scheduled_at/meeting_duration_minutes/meeting_transcript/
rejected_at, plus a new calendly_booking_events table backing the dashboard's Schedule
page and its approve/reject review flow.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5c4823e4dc2'
down_revision: Union[str, None] = '698c208411e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('meeting_scheduled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('meeting_duration_minutes', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('meeting_transcript', sa.Text(), nullable=True))
    op.add_column('leads', sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        'calendly_booking_events',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('invitee_name', sa.String(length=200), nullable=False),
        sa.Column('invitee_email', sa.String(length=320), nullable=False),
        sa.Column('event_type_name', sa.String(length=200), nullable=True),
        sa.Column('event_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('kind', sa.Enum('created', 'rescheduled', 'canceled', name='calendly_event_kind'), nullable=False, server_default='created'),
        sa.Column('reschedule_reason', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('pending_review', 'approved', 'rejected', name='calendly_event_status'),
            nullable=False,
            server_default='pending_review',
        ),
        sa.Column('gmail_message_id', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('calendly_booking_events')
    sa.Enum(name='calendly_event_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='calendly_event_kind').drop(op.get_bind(), checkfirst=True)
    op.drop_column('leads', 'rejected_at')
    op.drop_column('leads', 'meeting_transcript')
    op.drop_column('leads', 'meeting_duration_minutes')
    op.drop_column('leads', 'meeting_scheduled_at')
