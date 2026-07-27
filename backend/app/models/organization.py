import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import Timestamped, UUIDPk

PLAN_VALUES = ("trial", "starter", "growth", "scale", "enterprise")
BILLING_STATUS_VALUES = ("active", "past_due", "canceled", "trialing")


class Organization(Base, UUIDPk, Timestamped):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    plan: Mapped[str] = mapped_column(Enum(*PLAN_VALUES, name="org_plan"), default="trial")
    billing_status: Mapped[str] = mapped_column(
        Enum(*BILLING_STATUS_VALUES, name="org_billing_status"), default="trialing"
    )
    # Dummy billing only (product owner does not use real Stripe) — these are free-text
    # placeholders a user can type anything into; nothing here ever calls a real Stripe API.
    stripe_customer_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    branding_config: Mapped[dict] = mapped_column(JSONB, default=dict)

    users: Mapped[list["User"]] = relationship(back_populates="organization")  # noqa: F821
