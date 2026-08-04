"""Dashboard Schedule page — reviews Calendly bookings/reschedules/cancellations
detected from the connected Gmail inbox (app/services/calendly_booking_service.py).
Approving is the only way a detected event actually updates a lead's pipeline —
detection alone never touches lead state, since parsing an email is inherently less
certain than a signed webhook payload."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_action import AgentAction
from app.models.calendly_event import CalendlyBookingEvent
from app.models.lead import Lead
from app.models.user import User

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


def _to_dict(e: CalendlyBookingEvent) -> dict:
    return {
        "id": str(e.id),
        "leadId": str(e.lead_id) if e.lead_id else None,
        "inviteeName": e.invitee_name,
        "inviteeEmail": e.invitee_email,
        "eventTypeName": e.event_type_name,
        "eventStart": e.event_start.isoformat(),
        "durationMinutes": e.duration_minutes,
        "kind": e.kind,
        "rescheduleReason": e.reschedule_reason,
        "status": e.status,
        "createdAt": e.created_at.isoformat(),
        "resolvedAt": e.resolved_at.isoformat() if e.resolved_at else None,
    }


@router.get("")
async def list_schedule(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    events = (
        await db.execute(
            select(CalendlyBookingEvent)
            .where(CalendlyBookingEvent.organization_id == user.organization_id)
            .order_by(CalendlyBookingEvent.event_start.desc())
        )
    ).scalars().all()
    return {"events": [_to_dict(e) for e in events]}


async def _get_event(event_id: str, user: User, db: AsyncSession) -> CalendlyBookingEvent:
    event = (
        await db.execute(
            select(CalendlyBookingEvent).where(CalendlyBookingEvent.id == event_id, CalendlyBookingEvent.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if event is None:
        raise HTTPException(status_code=404, detail="Not found")
    return event


@router.post("/{event_id}/approve")
async def approve_event(event_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await _get_event(event_id, user, db)
    if event.status != "pending_review":
        raise HTTPException(status_code=409, detail=f"Already {event.status}")

    lead = None
    if event.lead_id:
        lead = (await db.execute(select(Lead).where(Lead.id == event.lead_id))).scalar_one_or_none()
    if lead is None:
        # A lead may have been created after this event was first detected — re-check by
        # email before giving up, rather than staying stuck on a stale "no match" result.
        lead = (
            await db.execute(
                select(Lead)
                .where(Lead.organization_id == user.organization_id, Lead.contact_email == event.invitee_email)
                .order_by(Lead.created_at.desc())
            )
        ).scalars().first()

    if lead is None:
        raise HTTPException(status_code=400, detail=f"No lead found with email {event.invitee_email} — nothing to update")

    now = datetime.now(timezone.utc)
    if event.kind == "canceled":
        lead.meeting_scheduled_at = None
        lead.meeting_duration_minutes = None
        reasoning = f"Calendly cancellation confirmed for {event.invitee_name} — meeting removed from schedule"
    else:
        lead.meeting_scheduled_at = event.event_start
        lead.meeting_duration_minutes = event.duration_minutes
        lead.status = "booked"  # §6 sync rule, same as webhooks_calendly.py
        lead.pipeline_stage = "meeting_scheduled"
        if lead.booked_at is None:
            lead.booked_at = now
        reasoning = (
            f"Calendly {'reschedule' if event.kind == 'rescheduled' else 'booking'} confirmed for {event.invitee_name} "
            f"at {event.event_start.strftime('%H:%M on %d %b %Y')}"
            + (f" — reason given: {event.reschedule_reason}" if event.reschedule_reason else "")
        )

    event.status = "approved"
    event.lead_id = lead.id
    event.resolved_at = now
    db.add(AgentAction(lead_id=lead.id, organization_id=user.organization_id, action_type="scheduled_meeting", reasoning=reasoning))
    await db.commit()

    from app.realtime import publish_event

    await publish_event(user.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": lead.status})
    return {"ok": True, "leadId": str(lead.id)}


@router.post("/{event_id}/reject")
async def reject_event(event_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await _get_event(event_id, user, db)
    if event.status != "pending_review":
        raise HTTPException(status_code=409, detail=f"Already {event.status}")
    event.status = "rejected"
    event.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
