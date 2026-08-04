"""add outbound_leads table (osm/geoapify/github) + 'outbound' lead_source value

Revision ID: b1a2c3d4e5f6
Revises: c5c4823e4dc2
Create Date: 2026-08-04 00:00:00.000000

SKILL-OUTBOUND.md — free outbound lead prospecting. Replaces an earlier, never-applied
draft migration (add_outbound_leads_20230802.py, down_revision=None, never chained onto
the real history) with one properly chained onto the actual head and matching the
final OutboundLead model (UUID ids/org FK, tech_stack/github_org_or_user/location,
osm/geoapify/github source enum). Also extends the existing lead_source enum with
'outbound' so a promoted OutboundLead can become a real Lead row.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg

# revision identifiers, used by Alembic.
revision: str = 'b1a2c3d4e5f6'
down_revision: Union[str, None] = 'c5c4823e4dc2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # New value on an existing enum type — must run as its own statement, not used
    # for any insert/select in this same migration (Postgres restriction).
    op.execute("ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'outbound'")

    # Raw conditional-create DO blocks instead of pg.ENUM(...).create(checkfirst=True)
    # — checkfirst's existence check was unreliable under this project's async
    # Alembic setup (threw DuplicateObjectError even though the type didn't exist
    # before or after the failed, rolled-back attempt).
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbound_lead_source') THEN "
        "CREATE TYPE outbound_lead_source AS ENUM ('osm', 'geoapify', 'github'); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outbound_lead_status') THEN "
        "CREATE TYPE outbound_lead_status AS ENUM ('found', 'added_to_campaign', 'contacted', 'rejected'); "
        "END IF; END $$;"
    )
    outbound_source = pg.ENUM(name="outbound_lead_source", create_type=False)
    outbound_status = pg.ENUM(name="outbound_lead_status", create_type=False)

    op.create_table(
        "outbound_leads",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", pg.UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("business_name", sa.String(300), nullable=False),
        sa.Column("category", sa.String(200), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(64), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("location", sa.String(300), nullable=True),
        sa.Column("tech_stack", pg.JSONB(), nullable=True),
        sa.Column("github_org_or_user", sa.String(200), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("source", outbound_source, nullable=False, server_default="osm"),
        sa.Column("status", outbound_status, nullable=False, server_default="found"),
        sa.Column("promoted_lead_id", pg.UUID(as_uuid=True), sa.ForeignKey("leads.id"), nullable=True),
        sa.Column("found_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_outbound_leads_organization_id", "outbound_leads", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_outbound_leads_organization_id", table_name="outbound_leads")
    op.drop_table("outbound_leads")
    op.execute("DROP TYPE outbound_lead_status")
    op.execute("DROP TYPE outbound_lead_source")
    # Postgres doesn't support removing an enum value — 'outbound' stays in lead_source.
