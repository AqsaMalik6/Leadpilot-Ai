from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_organization, require_roles
from app.models.lead import Lead
from app.models.organization import Organization
from app.models.user import User
from app.schemas.billing import DummyCheckoutInput
from app.services.billing_service import dummy_checkout, get_billing

router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get("/plan")
async def get_plan(org: Organization = Depends(get_current_organization), db: AsyncSession = Depends(get_db)):
    leads_this_cycle = (
        await db.execute(select(func.count()).select_from(Lead).where(Lead.organization_id == org.id, Lead.is_demo.is_(False)))
    ).scalar_one()
    return await get_billing(db, org, leads_this_cycle)


@router.get("/usage")
async def get_usage(org: Organization = Depends(get_current_organization), db: AsyncSession = Depends(get_db)):
    leads_this_cycle = (
        await db.execute(select(func.count()).select_from(Lead).where(Lead.organization_id == org.id, Lead.is_demo.is_(False)))
    ).scalar_one()
    return {"leadsProcessedThisCycle": leads_this_cycle}


@router.post("/checkout")
async def checkout(
    payload: DummyCheckoutInput,
    user: User = Depends(require_roles("owner", "admin")),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db),
):
    """Dummy billing only — see app/services/billing_service.py. Whatever plan is
    submitted here is accepted immediately; there is no real Stripe account behind
    this product (SKILL-BACKEND.md, edited MVP scope note)."""
    return await dummy_checkout(db, org, payload.plan_id)


@router.post("/portal-session")
async def portal_session():
    return {"url": "/dashboard/billing", "dummy": True}
