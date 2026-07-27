"""SKILL-DIGITAL-FTE-UPGRADE.md §5 — Calendly webhook receiver: auto-detects a real
booking (invitee.created) instead of requiring a human to manually flip the dashboard
status to "booked". [LOCAL] code + signature verification, [DEPLOY] to actually
receive real events — Calendly POSTs to a public URL registered in Calendly's
dashboard, which localhost can't be. Testable locally today via ngrok/localtunnel, or
by POSTing a correctly-signed payload directly (see the verification steps in
SKILL-DIGITAL-FTE-UPGRADE.md).
"""

import hashlib
import hmac
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.agent_action import AgentAction
from app.models.lead import Lead
from app.models.notification import Notification
from app.realtime import publish_event
from app.services.email_service import send_email
from app.services.notification_service import _org_owner_email

logger = logging.getLogger("leadpilot.webhooks.calendly")
router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


def _verify_signature(raw_body: bytes, signature_header: str | None, secret: str) -> bool:
    """Calendly's webhook signing scheme: header is `t=<timestamp>,v1=<hex hmac-sha256>`
    over the string `f"{t}.{raw_body}"`. Fails closed — no secret configured or no/malformed
    header means reject, never silently trust an unsigned payload."""
    if not secret or not signature_header:
        return False
    try:
        parts = dict(p.split("=", 1) for p in signature_header.split(","))
        timestamp, signature = parts["t"], parts["v1"]
    except (KeyError, ValueError):
        return False

    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/calendly", status_code=202)
async def calendly_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    calendly_webhook_signature: str | None = Header(default=None),
):
    settings = get_settings()
    raw_body = await request.body()
    if not _verify_signature(raw_body, calendly_webhook_signature, settings.calendly_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid or missing webhook signature")

    payload = await request.json()
    if payload.get("event") != "invitee.created":
        return {"accepted": True, "ignored": True}

    invitee = payload.get("payload", {})
    email = invitee.get("email")
    if not email:
        return {"accepted": False, "reason": "no invitee email in payload"}

    lead = (
        await db.execute(
            select(Lead).where(Lead.contact_email == email, Lead.status.in_(["new", "qualified"])).order_by(Lead.created_at.desc())
        )
    ).scalars().first()
    if lead is None:
        logger.info("Calendly booking for %s didn't match any open lead — ignoring", email)
        return {"accepted": True, "matched": False}

    now = datetime.now(timezone.utc)
    lead.status = "booked"  # §6 sync rule: meeting_scheduled -> status=booked
    lead.pipeline_stage = "meeting_scheduled"
    if lead.booked_at is None:
        lead.booked_at = now

    db.add(
        AgentAction(
            lead_id=lead.id,
            organization_id=lead.organization_id,
            action_type="scheduled_meeting",
            reasoning=f"Calendly confirmed a real booking for {invitee.get('name', email)}",
        )
    )

    owner_email = await _org_owner_email(lead.organization_id)
    notification = Notification(
        organization_id=lead.organization_id,
        lead_id=lead.id,
        type="lead_booked",
        channel="email",
        status="pending",
        payload={"leadName": lead.contact_name},
    )
    db.add(notification)
    await db.flush()
    if owner_email:
        sent = await send_email(owner_email, f"LeadPilot: {lead.contact_name} just booked a call", f"{lead.contact_name} confirmed a Calendly booking.")
        notification.status = "sent" if sent else "failed"
        notification.sent_at = now if sent else None
    await db.commit()

    await publish_event(lead.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": "booked"})
    return {"accepted": True, "matched": True, "lead_id": str(lead.id)}
