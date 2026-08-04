import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import UUIDPk

# SKILL-MULTI-TENANT-CONNECT.md §3 — per-org WhatsApp session via the unofficial
# "linked device" protocol (the same one WhatsApp Web itself uses), paired by QR code
# through a Node/Baileys sidecar (whatsapp_sidecar/). Deliberately NOT Meta's official
# Business Cloud API — no Meta App/Business verification needed, at the cost of this
# being an unofficial protocol with real (if generally low at small scale) ban risk —
# see app/services/whatsapp_service.py's docstring for the full, undiluted disclosure.
WHATSAPP_ACCOUNT_STATUS_VALUES = ("qr_pending", "connected", "disconnected", "banned", "error")


class WhatsAppAccount(Base, UUIDPk):
    __tablename__ = "whatsapp_accounts"

    # UNIQUE (unlike gmail_accounts, deliberately) — one linked-device session per
    # org given the ban-risk profile; a second session would also just fight the
    # first for the same WhatsApp account's single "linked devices" slot budget.
    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), unique=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(Enum(*WHATSAPP_ACCOUNT_STATUS_VALUES, name="whatsapp_account_status"), default="disconnected")
    qr_code_data_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Baileys' {creds, keys} auth-state blob, JSON-serialized then Fernet-encrypted via
    # app/core/encryption.py — the same helper gmail_accounts/Integration already use.
    # Encryption happens backend-side (never in the Node sidecar) so the key stays in
    # exactly one runtime.
    auth_state_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    reconnect_attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
