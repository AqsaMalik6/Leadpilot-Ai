import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import Timestamped, UUIDPk

# "website_form", not "web_form" — matches the frontend's ChannelSchema exactly (SKILL-BACKEND.md §1)
# "gmail" added per SKILL-DIGITAL-FTE-UPGRADE.md §1 — paired with a raw ALTER TYPE ADD
# VALUE migration against the three Postgres enum types below (autogenerate can't do it).
CHANNEL_VALUES = ("website_form", "whatsapp", "email", "gmail")
SOURCE_VALUES = ("website_form", "whatsapp", "email", "gmail", "demo_sandbox")
# Dropped in_progress — not in the frontend's LeadStatusSchema. A mid-conversation lead
# just stays "new" until the decision node flips it; human takeover lives on
# conversations.status instead, so it never surfaces on the lead badge.
LEAD_STATUS_VALUES = ("new", "qualified", "booked", "rejected")
CONVERSATION_STATUS_VALUES = ("active", "completed", "handed_off")
# Dropped human_rep — the frontend's MessageRoleSchema only has these 3. A human
# takeover still posts with role="agent" and metadata.human_rep_id set.
MESSAGE_ROLE_VALUES = ("lead", "agent", "system")

# SKILL-DIGITAL-FTE-UPGRADE.md §1/§6 — additive to `status`, never replaces it (see
# the sync rule in agent/tools.py and routers/leads.py). Existing dashboard badges,
# filters, and LeadStatusSchema are untouched by this field.
PIPELINE_STAGE_VALUES = ("new", "contacted", "qualified", "meeting_scheduled", "proposal_sent", "won", "lost")
TEMPERATURE_VALUES = ("hot", "warm", "cold")


class LeadChannel(Base, UUIDPk):
    __tablename__ = "lead_channels"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    channel_type: Mapped[str] = mapped_column(Enum(*CHANNEL_VALUES, name="channel_type"))
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Lead(Base, UUIDPk, Timestamped):
    __tablename__ = "leads"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    channel_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lead_channels.id"), nullable=True
    )
    source: Mapped[str] = mapped_column(Enum(*SOURCE_VALUES, name="lead_source"))
    contact_name: Mapped[str] = mapped_column(String(200))
    contact_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(Enum(*LEAD_STATUS_VALUES, name="lead_status"), default="new")

    # Flattened qualification fields — avoids joining messages just to render the leads
    # table/detail header. Field-for-field match to the frontend's QualificationSchema.
    budget: Mapped[str | None] = mapped_column(Text, nullable=True)
    timeline: Mapped[str | None] = mapped_column(Text, nullable=True)
    need: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_size: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_authority: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    qualification_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qualification_answers: Mapped[list] = mapped_column(JSONB, default=list)

    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    calendly_booking_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    response_time_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    booked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    assigned_rep_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # SKILL-DIGITAL-FTE-UPGRADE.md §1/§6/§3 — autonomous pipeline tracking, additive to status.
    pipeline_stage: Mapped[str] = mapped_column(Enum(*PIPELINE_STAGE_VALUES, name="pipeline_stage"), default="new")
    temperature: Mapped[str] = mapped_column(Enum(*TEMPERATURE_VALUES, name="lead_temperature"), default="warm")
    last_inbound_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_outbound_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    follow_up_count: Mapped[int] = mapped_column(Integer, default=0)
    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Conversation(Base, UUIDPk, Timestamped):
    __tablename__ = "conversations"

    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), unique=True)
    status: Mapped[str] = mapped_column(Enum(*CONVERSATION_STATUS_VALUES, name="conversation_status"), default="active")
    # SKILL-DIGITAL-FTE-UPGRADE.md §2 — rolling AI context summary once history exceeds
    # 12 messages (see agent/pipeline.py), so long Gmail threads don't replay in full.
    memory_summary: Mapped[str | None] = mapped_column(Text, nullable=True)


class Message(Base, UUIDPk):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(Enum(*MESSAGE_ROLE_VALUES, name="message_role"))
    content: Mapped[str] = mapped_column(Text)  # API field `text`
    channel: Mapped[str] = mapped_column(Enum(*CHANNEL_VALUES, name="message_channel"))
    # model used (always "groq" now), latency_ms, guardrail_flags, human_rep_id (nullable)
    message_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())  # API field `timestamp`
