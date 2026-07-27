import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# "lead_cold" added per SKILL-DIGITAL-FTE-UPGRADE.md §3/§7 (follow_up_sweep marking a
# lead cold after two unanswered follow-ups) — paired with a raw ALTER TYPE ADD VALUE migration.
NOTIFICATION_TYPE_VALUES = ("lead_qualified", "lead_booked", "lead_rejected", "weekly_summary", "lead_cold")
# Slack channel deferred to Phase 2 with the Slack integration itself
NOTIFICATION_CHANNEL_VALUES = ("email",)
NOTIFICATION_STATUS_VALUES = ("pending", "sent", "failed")


class Notification(Base, UUIDPk):
    __tablename__ = "notifications"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    lead_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    type: Mapped[str] = mapped_column(Enum(*NOTIFICATION_TYPE_VALUES, name="notification_type"))
    channel: Mapped[str] = mapped_column(Enum(*NOTIFICATION_CHANNEL_VALUES, name="notification_channel"), default="email")
    status: Mapped[str] = mapped_column(Enum(*NOTIFICATION_STATUS_VALUES, name="notification_status"), default="pending")
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContactSubmission(Base, UUIDPk):
    __tablename__ = "contact_submissions"

    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320))
    company: Mapped[str | None] = mapped_column(String(200), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    notified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
