"""Scheduled jobs (SKILL-BACKEND.md §4). Registered as Celery tasks for Phase 2
(USE_CELERY=true + celery beat running); each function is also plain async Python you
can invoke directly from a one-off script if you'd rather not run Celery at all yet.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.db import SessionLocal
from app.models.lead import Lead
from app.models.organization import Organization
from app.models.user import User
from app.services.email_service import send_email
from app.tasks.celery_app import celery_app


async def _weekly_summary_digest() -> int:
    sent = 0
    async with SessionLocal() as db:
        orgs = (await db.execute(select(Organization))).scalars().all()
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        for org in orgs:
            count = (
                await db.execute(
                    select(func.count()).select_from(Lead).where(Lead.organization_id == org.id, Lead.created_at >= week_ago, Lead.is_demo.is_(False))
                )
            ).scalar_one()
            owner = (await db.execute(select(User).where(User.organization_id == org.id, User.role == "owner"))).scalar_one_or_none()
            if owner and count:
                await send_email(owner.email, f"Your weekly LeadPilot summary — {count} leads", f"{org.name} processed {count} leads in the last 7 days.")
                sent += 1
    return sent


async def _usage_billing_sync() -> int:
    """Dummy billing (SKILL-BACKEND.md edited MVP scope) — nothing here reconciles
    against a real Stripe meter. Reserved for when/if real usage-based billing lands."""
    async with SessionLocal() as db:
        orgs = (await db.execute(select(Organization))).scalars().all()
        return len(orgs)


@celery_app.task(name="app.tasks.jobs.weekly_summary_digest")
def weekly_summary_digest() -> int:
    return asyncio.run(_weekly_summary_digest())


@celery_app.task(name="app.tasks.jobs.usage_billing_sync")
def usage_billing_sync() -> int:
    return asyncio.run(_usage_billing_sync())
