"""Dummy billing only — per the product owner, there is no real Stripe account behind
this product. Whatever plan a user submits through `dummy_checkout` is accepted and
applied immediately; nothing in this module ever calls the real Stripe API
(SKILL-BACKEND.md §2.9, edited MVP scope note: "dummy Stripe billing").

Plan display details are read from `pricing_tiers` (Phase 2 CMS) when seeded, with a
small hardcoded fallback so billing still works before the CMS seed script has run.
"""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cms import PricingTier
from app.models.organization import Organization
from app.schemas.billing import Billing, Invoice

_FALLBACK_PLAN_NAMES = {
    "trial": "Trial",
    "starter": "Starter",
    "growth": "Growth",
    "scale": "Scale",
    "enterprise": "Enterprise",
}
_FALLBACK_LEADS_INCLUDED = {"trial": 25, "starter": 200, "growth": 750, "scale": 2500, "enterprise": 10000}


async def _plan_name_and_limit(db: AsyncSession, plan_id: str) -> tuple[str, int]:
    tier = (await db.execute(select(PricingTier).where(PricingTier.id == plan_id))).scalar_one_or_none()
    if tier:
        return tier.name, tier.leads_included_per_month or _FALLBACK_LEADS_INCLUDED.get(plan_id, 100)
    return _FALLBACK_PLAN_NAMES.get(plan_id, plan_id.title()), _FALLBACK_LEADS_INCLUDED.get(plan_id, 100)


def _dummy_invoices(org: Organization) -> list[Invoice]:
    now = datetime.now(timezone.utc)
    months_active = max(1, (now.year - org.created_at.year) * 12 + (now.month - org.created_at.month) + 1)
    invoices = []
    for i in range(min(months_active, 6)):
        invoice_date = now - timedelta(days=30 * i)
        invoices.append(
            Invoice(
                id=f"inv_dummy_{org.id}_{i}",
                date=invoice_date.date().isoformat(),
                amount_cents=0,
                status="paid",
                pdf_url="#",
            )
        )
    return invoices


async def get_billing(db: AsyncSession, org: Organization, leads_processed_this_cycle: int) -> Billing:
    plan_name, leads_included = await _plan_name_and_limit(db, org.plan)
    cycle_ends = (datetime.now(timezone.utc).replace(day=1) + timedelta(days=32)).replace(day=1)
    return Billing(
        plan_id=org.plan,
        plan_name=plan_name,
        leads_processed_this_cycle=leads_processed_this_cycle,
        leads_included=leads_included,
        cycle_ends_at=cycle_ends.date().isoformat(),
        invoices=_dummy_invoices(org),
    )


async def dummy_checkout(db: AsyncSession, org: Organization, plan_id: str) -> Billing:
    """Accept-anything dummy checkout — no real payment network involved."""
    org.plan = plan_id if plan_id in _FALLBACK_PLAN_NAMES else org.plan
    org.billing_status = "active"
    org.stripe_customer_id = org.stripe_customer_id or f"dummy_cus_{uuid.uuid4().hex[:16]}"
    org.stripe_subscription_id = f"dummy_sub_{uuid.uuid4().hex[:16]}"
    await db.commit()
    await db.refresh(org)
    return await get_billing(db, org, leads_processed_this_cycle=0)
