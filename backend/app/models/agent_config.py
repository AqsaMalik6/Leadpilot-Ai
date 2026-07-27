import uuid
from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import Timestamped, UUIDPk

# qualifying_questions item shape (jsonb): {id, field, prompt, required}
# field-for-field match to the frontend's QualifyingQuestionSchema — see SKILL-BACKEND.md §1
DEFAULT_QUALIFYING_QUESTIONS = [
    {"id": "q1", "field": "need", "prompt": "What's prompting you to look into this right now?", "required": True},
    {"id": "q2", "field": "budget", "prompt": "Do you have a budget range in mind?", "required": False},
    {"id": "q3", "field": "timeline", "prompt": "What's your ideal timeline to get started?", "required": True},
    {"id": "q4", "field": "companySize", "prompt": "How large is your team or lead volume?", "required": True},
    {
        "id": "q5",
        "field": "authority",
        "prompt": "Are you the one making the final call on this, or is someone else involved?",
        "required": False,
    },
]

DEFAULT_GUARDRAILS = [
    "Never discuss pricing beyond the published tiers",
    "Never make legal, medical, or financial guarantees",
    "Escalate to a human immediately if the lead expresses frustration or asks for a refund",
    "Never claim to be a human sales rep",
]


class AgentConfig(Base, UUIDPk, Timestamped):
    __tablename__ = "agent_configs"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), unique=True
    )
    persona: Mapped[str] = mapped_column(Text, default="")
    qualifying_questions: Mapped[list] = mapped_column(JSONB, default=lambda: DEFAULT_QUALIFYING_QUESTIONS)
    guardrails: Mapped[list[str]] = mapped_column(ARRAY(String), default=lambda: list(DEFAULT_GUARDRAILS))
    handoff_threshold_score: Mapped[int] = mapped_column(Integer, default=70)
    calendly_link: Mapped[str | None] = mapped_column(String(500), nullable=True)
    system_prompt_override: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    # {"email": {"new_lead": bool, "qualified": bool, "booked": bool, "rejected": bool}, "slack": {...}}
    # Slack side is stored but not enforced yet — no real Slack connection exists (Phase 2).
    notification_rules: Mapped[dict] = mapped_column(JSONB, default=dict)


class AgentConfigHistory(Base, UUIDPk):
    __tablename__ = "agent_config_history"

    agent_config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agent_configs.id"))
    snapshot: Mapped[dict] = mapped_column(JSONB)
    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
