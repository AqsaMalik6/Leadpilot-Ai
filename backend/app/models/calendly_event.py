import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# No public URL exists for a real Calendly webhook subscription (app/routers/
# webhooks_calendly.py needs one), so bookings are instead detected by parsing
# Calendly's own notification emails as they arrive in the connected Gmail inbox
# (app/jobs/calendly_email_poll.py). Because parsing an email is inherently less
# certain than a signed webhook payload, detections land here as "pending_review"
# and a human approves them from the dashboard's Schedule page — never auto-booked.
CALENDLY_EVENT_KIND_VALUES = ("created", "rescheduled", "canceled")
CALENDLY_EVENT_STATUS_VALUES = ("pending_review", "approved", "rejected")


class CalendlyBookingEvent(Base, UUIDPk):
    __tablename__ = "calendly_booking_events"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    lead_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    invitee_name: Mapped[str] = mapped_column(String(200))
    invitee_email: Mapped[str] = mapped_column(String(320))
    event_type_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    event_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    kind: Mapped[str] = mapped_column(Enum(*CALENDLY_EVENT_KIND_VALUES, name="calendly_event_kind"), default="created")
    reschedule_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Enum(*CALENDLY_EVENT_STATUS_VALUES, name="calendly_event_status"), default="pending_review")
    gmail_message_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
