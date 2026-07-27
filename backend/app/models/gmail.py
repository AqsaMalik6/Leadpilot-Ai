import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# SKILL-DIGITAL-FTE-UPGRADE.md §1/§2. Structure is real and ready; actually populating a
# row requires running scripts/gmail_oauth_setup.py once with real Google OAuth client
# credentials (see app/config.py's gmail_oauth_client_id/secret) — no such credentials
# exist in this environment yet, so this table is unused until the user supplies them
# (same honest "real but needs your keys" status as WhatsApp/Resend before those were set).


class GmailAccount(Base, UUIDPk):
    __tablename__ = "gmail_accounts"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    email_address: Mapped[str] = mapped_column(String(320))
    oauth_tokens_encrypted: Mapped[bytes] = mapped_column(LargeBinary)  # via app/core/encryption.py
    last_history_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
