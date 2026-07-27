import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# Digital FTE upgrade — post-meeting flow: meeting_scheduled -> AI drafts a proposal ->
# a human manager approves it -> it's emailed to the lead -> pipeline_stage becomes
# proposal_sent. Draft/approved/sent is a one-directional state machine mirroring the
# lead.pipeline_stage sync rule already used elsewhere in this app.
PROPOSAL_STATUS_VALUES = ("draft", "approved", "sent")


class Proposal(Base, UUIDPk):
    __tablename__ = "proposals"

    lead_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), unique=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    subject: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Enum(*PROPOSAL_STATUS_VALUES, name="proposal_status"), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
