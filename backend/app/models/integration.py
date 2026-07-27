import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, LargeBinary, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# salesforce dropped for MVP (Phase 2 add-back); website_form/whatsapp/email live in
# lead_channels, not here — see the merged-view rule in SKILL-BACKEND.md §1.
PROVIDER_VALUES = ("calendly", "slack", "hubspot")
INTEGRATION_STATUS_VALUES = ("connected", "error", "disconnected")


class Integration(Base, UUIDPk):
    __tablename__ = "integrations"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    provider: Mapped[str] = mapped_column(Enum(*PROVIDER_VALUES, name="integration_provider"))
    credentials_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    status: Mapped[str] = mapped_column(Enum(*INTEGRATION_STATUS_VALUES, name="integration_status"), default="disconnected")
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
