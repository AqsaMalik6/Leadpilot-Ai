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


async def notify_gmail_reconnect_needed(organization_id: uuid.UUID, email_address: str) -> bool:
    owner_email = await _org_owner_email(organization_id)
    if owner_email is None:
        return False
    subject = "LeadPilot: Gmail needs to be reconnected"
    body = (
        f"LeadPilot lost access to {email_address} — this can happen if the connection was revoked, "
        "the password changed, or Google access was removed.\n\n"
        "New replies won't be read or sent from this inbox until you reconnect it from "
        "Dashboard → Integrations."
    )
    return await send_email(owner_email, subject, body)


async def notify_gmail_pending_reply(organization_id: uuid.UUID, lead_name: str, to_email: str) -> bool:
    owner_email = await _org_owner_email(organization_id)
    if owner_email is None:
        return False
    subject = f"LeadPilot: a draft reply to {lead_name} is waiting for your approval"
    body = (
        f"LeadPilot drafted a reply to {lead_name} <{to_email}> but is holding it for your review "
        "(Gmail reply mode is set to \"Review first\").\n\n"
        "Approve or edit it from Dashboard → Integrations before it sends."
    )
    return await send_email(owner_email, subject, body)


async def notify_calendly_event_detected(organization_id: uuid.UUID, event, matched_lead: bool) -> bool:
    """`event` is a CalendlyBookingEvent — typed loosely to avoid a circular import
    (app/models/calendly_event.py doesn't need to know about notifications)."""
    owner_email = await _org_owner_email(organization_id)
    if owner_email is None:
        return False
    kind_label = {"created": "New booking", "rescheduled": "Rescheduled booking", "canceled": "Canceled booking"}[event.kind]
    match_note = "matched to an existing lead" if matched_lead else "no matching lead found — check the email address"
    reason_line = f"\nReason given: {event.reschedule_reason}" if event.reschedule_reason else ""
    subject = f"LeadPilot: {kind_label} detected — {event.invitee_name}"
    body = (
        f"Calendly {kind_label.lower()} detected in your inbox for {event.invitee_name} <{event.invitee_email}> "
        f"at {event.event_start.strftime('%H:%M on %A, %d %B %Y')} ({event.duration_minutes} min) — {match_note}."
        f"{reason_line}\n\n"
        "Review and approve it from Dashboard → Schedule."
    )
    return await send_email(owner_email, subject, body)
