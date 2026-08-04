"""add whatsapp_accounts table

Revision ID: 9c2e4f61a8d3
Revises: 7f3c1a9d2b44
Create Date: 2026-07-27 00:00:00.000000

SKILL-MULTI-TENANT-CONNECT.md §3 — per-org WhatsApp session table backing the
Baileys/QR self-connect flow (no Meta App secret needed). organization_id is UNIQUE,
deliberately unlike gmail_accounts — one linked-device session per org.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c2e4f61a8d3'
down_revision: Union[str, None] = '7f3c1a9d2b44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'whatsapp_accounts',
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('phone_number', sa.String(length=32), nullable=True),
        sa.Column(
            'status',
            sa.Enum('qr_pending', 'connected', 'disconnected', 'banned', 'error', name='whatsapp_account_status'),
            nullable=False,
        ),
        sa.Column('qr_code_data_url', sa.Text(), nullable=True),
        sa.Column('auth_state_encrypted', sa.LargeBinary(), nullable=True),
        sa.Column('last_connected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_status_message', sa.Text(), nullable=True),
        sa.Column('reconnect_attempts', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id'),
    )


def downgrade() -> None:
    op.drop_table('whatsapp_accounts')
    sa.Enum(name='whatsapp_account_status').drop(op.get_bind(), checkfirst=True)
