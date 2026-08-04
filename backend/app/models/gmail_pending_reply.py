import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# One row per AI-drafted Gmail reply that's held back instead of sent, because the org
# has AgentConfig.gmail_reply_mode="review_first" (app/jobs/gmail_poll.py writes these
# instead of calling send_reply() directly). Approving/rejecting is the only way a
# pending row leaves "pending" — there's no automatic timeout/auto-send fallback,
# since the whole point of review mode is that nothing goes out without a human OK.
GMAIL_PENDING_REPLY_STATUS_VALUES = ("pending", "approved", "rejected")


class GmailPendingReply(Base, UUIDPk):
    __tablename__ = "gmail_pending_replies"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"))
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    gmail_account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("gmail_accounts.id"))
    to_email: Mapped[str] = mapped_column(String(320))
    subject: Mapped[str] = mapped_column(String(500))
    body_text: Mapped[str] = mapped_column(Text)
    gmail_thread_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(Enum(*GMAIL_PENDING_REPLY_STATUS_VALUES, name="gmail_pending_reply_status"), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
