"""Turns a parsed Calendly notification email into a CalendlyBookingEvent row pending
human review — see app/services/calendly_email_parser.py for why email parsing (not a
webhook) is the detection mechanism, and app/models/calendly_event.py for why this
lands as pending_review rather than auto-booking like app/routers/webhooks_calendly.py
does for a real signed webhook."""

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.calendly_event import CalendlyBookingEvent
from app.models.lead import Lead
from app.services.calendly_email_parser import parse_calendly_notification
from app.services.notification_service import notify_calendly_event_detected

logger = logging.getLogger("leadpilot.calendly_booking_service")


async def handle_calendly_notification(
    db: AsyncSession, organization_id: uuid.UUID, subject: str, body_text: str, gmail_message_id: str | None
) -> None:
    if gmail_message_id:
        existing = (
            await db.execute(select(CalendlyBookingEvent.id).where(CalendlyBookingEvent.gmail_message_id == gmail_message_id))
        ).scalar_one_or_none()
        if existing:
            logger.info("calendly_booking_service: already processed gmail_message_id=%s", gmail_message_id)
            return

    parsed = parse_calendly_notification(subject, body_text)
    if parsed is None:
        logger.info("calendly_booking_service: subject=%r from Calendly didn't match the notification format — ignoring", subject)
        return

    lead = (
        await db.execute(
            select(Lead)
            .where(Lead.organization_id == organization_id, Lead.contact_email == parsed["invitee_email"])
            .order_by(Lead.created_at.desc())
        )
    ).scalars().first()

    event = CalendlyBookingEvent(
        organization_id=organization_id,
        lead_id=lead.id if lead else None,
        invitee_name=parsed["invitee_name"],
        invitee_email=parsed["invitee_email"],
        event_type_name=parsed["event_type_name"],
        event_start=parsed["event_start"],
        duration_minutes=parsed["duration_minutes"],
        kind=parsed["kind"],
        reschedule_reason=parsed["reschedule_reason"],
        status="pending_review",
        gmail_message_id=gmail_message_id,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    await notify_calendly_event_detected(organization_id, event, matched_lead=lead is not None)
