import uuid

from sqlalchemy import select

from app.db import SessionLocal
from app.models.lead import Lead
from app.models.user import User
from app.services.email_service import send_email


async def _org_owner_email(organization_id: uuid.UUID) -> str | None:
    """Shared owner-email lookup — used here and by app/jobs/follow_up_sweep.py."""
    async with SessionLocal() as db:
        owner = (
            await db.execute(
                select(User).where(User.organization_id == organization_id, User.role == "owner").limit(1)
            )
        ).scalar_one_or_none()
    return owner.email if owner else None


async def send_lead_notification_email(organization_id: uuid.UUID, lead_id: uuid.UUID, summary: str) -> bool:
    owner_email = await _org_owner_email(organization_id)
    async with SessionLocal() as db:
        lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one_or_none()

    if owner_email is None or lead is None:
        return False

    subject = f"LeadPilot: {lead.contact_name} just qualified"
    body = f"{summary}\n\nContact: {lead.contact_name} <{lead.contact_email or 'no email'}>\nPhone: {lead.contact_phone or 'n/a'}"
    return await send_email(owner_email, subject, body)
