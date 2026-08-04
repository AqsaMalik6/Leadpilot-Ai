"""add gmail reply mode, gmail account status, gmail pending replies

Revision ID: 698c208411e8
Revises: 9c2e4f61a8d3
Create Date: 2026-07-28 00:00:00.000000

Real Gmail flow enhancements: gmail_accounts.status/last_status_message (distinguish
"you disconnected this" from "Google revoked this, please reconnect"), agent_configs.
gmail_reply_mode (auto_send vs review_first), and a new gmail_pending_replies table
backing review_first mode.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '698c208411e8'
down_revision: Union[str, None] = '9c2e4f61a8d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    gmail_account_status = sa.Enum('connected', 'reconnect_needed', 'error', name='gmail_account_status')
    gmail_account_status.create(op.get_bind(), checkfirst=True)
    op.add_column('gmail_accounts', sa.Column('status', gmail_account_status, nullable=False, server_default='connected'))
    op.add_column('gmail_accounts', sa.Column('last_status_message', sa.Text(), nullable=True))

    gmail_reply_mode = sa.Enum('auto_send', 'review_first', name='gmail_reply_mode')
    gmail_reply_mode.create(op.get_bind(), checkfirst=True)
    op.add_column('agent_configs', sa.Column('gmail_reply_mode', gmail_reply_mode, nullable=False, server_default='auto_send'))

    op.create_table(
        'gmail_pending_replies',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('lead_id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('gmail_account_id', sa.UUID(), nullable=False),
        sa.Column('to_email', sa.String(length=320), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=False),
        sa.Column('gmail_thread_id', sa.String(length=100), nullable=True),
        sa.Column(
            'status',
            sa.Enum('pending', 'approved', 'rejected', name='gmail_pending_reply_status'),
            nullable=False,
            server_default='pending',
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id']),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id']),
        sa.ForeignKeyConstraint(['gmail_account_id'], ['gmail_accounts.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('gmail_pending_replies')
    sa.Enum(name='gmail_pending_reply_status').drop(op.get_bind(), checkfirst=True)
    op.drop_column('agent_configs', 'gmail_reply_mode')
    sa.Enum(name='gmail_reply_mode').drop(op.get_bind(), checkfirst=True)
    op.drop_column('gmail_accounts', 'last_status_message')
    op.drop_column('gmail_accounts', 'status')
    sa.Enum(name='gmail_account_status').drop(op.get_bind(), checkfirst=True)
