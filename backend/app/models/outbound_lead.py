"""SKILL-OUTBOUND.md — free outbound lead prospecting. A found business/org is staged
here first; only once the user picks specific rows via "Add to Campaign" does a real
`Lead` row get created, entering the existing Gmail/WhatsApp/CRM qualification pipeline
(zero new sending logic — see the router)."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base
from app.models.base import UUIDPk

# Where the lead was actually found — distinct from Lead.source's "outbound" value,
# which just marks provenance once it's promoted into the real leads table.
OUTBOUND_SOURCE_VALUES = ("osm", "geoapify", "github")
OUTBOUND_STATUS_VALUES = ("found", "added_to_campaign", "contacted", "rejected")


class OutboundLead(Base, UUIDPk):
    __tablename__ = "outbound_leads"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"))
    business_name: Mapped[str] = mapped_column(String(300))
    category: Mapped[str] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    website: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    # Only populated when source == "github" — list of languages/topics from the org's
    # public repos, e.g. ["Python", "TypeScript", "RAG"].
    tech_stack: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    github_org_or_user: Mapped[str | None] = mapped_column(String(200), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(Enum(*OUTBOUND_SOURCE_VALUES, name="outbound_lead_source"), default="osm")
    status: Mapped[str] = mapped_column(Enum(*OUTBOUND_STATUS_VALUES, name="outbound_lead_status"), default="found")
    promoted_lead_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("leads.id"), nullable=True)
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="outbound_leads")
