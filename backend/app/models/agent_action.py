import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# SKILL-DIGITAL-FTE-UPGRADE.md §1 — the AI reasoning/timeline log the dashboard reads
# from. Deliberately NOT a reuse of app/models/audit.py's AuditLog: that's an internal,
# human-actor security/compliance trail (actor_user_id, generic action string) — this
# is a lead-scoped, customer-facing reasoning feed. Different consumer, different shape.
ACTION_TYPE_VALUES = (
    "replied",
    "followed_up",
    "marked_cold",
    "scheduled_meeting",
    "classified_temperature",
    "notified_owner",
    "updated_pipeline_stage",
    "manual_override",
    "recorded_qualification",
    "outbound_outreach",
)


class AgentAction(Base, UUIDPk):
    __tablename__ = "agent_actions"

    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"))
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    action_type: Mapped[str] = mapped_column(Enum(*ACTION_TYPE_VALUES, name="agent_action_type"))
    reasoning: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
