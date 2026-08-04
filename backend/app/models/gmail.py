import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# SKILL-DIGITAL-FTE-UPGRADE.md §1/§2 + the self-serve Gmail connect flow
# (app/routers/gmail_connect.py). "reconnect_needed" is set when a scheduled token
# refresh fails (app/services/gmail_service.py's refresh_and_store_if_needed) —
# distinct from is_active=False (a customer explicitly disconnecting) so the
# dashboard can tell "you disconnected this" apart from "Google revoked this, please
# reconnect."
GMAIL_ACCOUNT_STATUS_VALUES = ("connected", "reconnect_needed", "error")


class GmailAccount(Base, UUIDPk):
    __tablename__ = "gmail_accounts"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    email_address: Mapped[str] = mapped_column(String(320))
    oauth_tokens_encrypted: Mapped[bytes] = mapped_column(LargeBinary)  # via app/core/encryption.py
    last_history_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(Enum(*GMAIL_ACCOUNT_STATUS_VALUES, name="gmail_account_status"), default="connected")
    last_status_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
