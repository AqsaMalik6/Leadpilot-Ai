from typing import Literal

from app.schemas.common import CamelModel


class Invoice(CamelModel):
    id: str
    date: str
    amount_cents: int
    status: Literal["paid", "open", "void"]
    pdf_url: str


class Billing(CamelModel):
    plan_id: str
    plan_name: str
    leads_processed_this_cycle: int
    leads_included: int
    cycle_ends_at: str
    invoices: list[Invoice]


class DummyCheckoutInput(CamelModel):
    """Dummy billing only — there is no real Stripe account behind this product.
    Whatever plan the user submits here is accepted and applied immediately; this
    never calls a real payment provider (SKILL-BACKEND.md §2.9)."""

    plan_id: str
    # Accept-anything fields so a fake "card form" can be wired up later without a
    # backend change — none of this is validated against a real payment network.
    billing_name: str | None = None
    billing_email: str | None = None
