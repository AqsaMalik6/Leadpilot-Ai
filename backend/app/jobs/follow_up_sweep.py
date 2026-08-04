"""SKILL-DIGITAL-FTE-UPGRADE.md §3 — the autonomous follow-up/cold-marking loop.

Runs as a plain asyncio.create_task loop started in app/main.py's lifespan (see §0/§2
of the spec: there was no existing recurring-job pattern in this app before this and
gmail_poll_job — no Celery/Redis involved, no paid infra).
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db import SessionLocal
from app.models.agent_action import AgentAction
from app.models.lead import Conversation, Lead, Message
from app.models.notification import Notification
from app.services.email_service import send_email
from app.services.notification_service import _org_owner_email  # reused, see below
from app.services.whatsapp_service import send_whatsapp_message_for_org

logger = logging.getLogger("leadpilot.jobs.follow_up_sweep")

SWEEP_INTERVAL_SECONDS = 15 * 60
FOLLOW_UP_AFTER = timedelta(hours=24)
COLD_AFTER = timedelta(hours=48)
# Outbound-promoted leads never sent us anything first (last_inbound_at stays null
# forever unless they reply) — close them out on their own timeline instead of the
# reply-based one above, per the user's own "1/2 days" instruction.
CLOSE_OUTBOUND_AFTER = timedelta(days=2)

FOLLOW_UP_MESSAGE = (
    "Hi {name}, just checking in — still interested in moving forward? Happy to answer "
    "any questions whenever you're ready."
)


async def _send_follow_up(lead: Lead) -> str | None:
    """Sends via whatsapp/email depending on what contact info the lead actually has.
    Returns the channel it sent on, or None if there's no usable contact info to reach
    the lead on (web-form leads with no phone/email captured yet) — a real limitation,
    not a bug: nothing to silently retry against."""
    text = FOLLOW_UP_MESSAGE.format(name=lead.contact_name)
    if lead.source == "whatsapp" and lead.contact_phone:
        await send_whatsapp_message_for_org(lead.organization_id, lead.contact_phone, text)
        return "whatsapp"
    if lead.contact_email:
        await send_email(lead.contact_email, "Following up — LeadPilot", text)
        return "email"
    return None


async def _close_stale_outbound_leads(db, now: datetime) -> int:
    """Outbound-promoted leads we reached out to cold and who never replied at all —
    distinct from the reply-based follow_up_sweep above, since last_inbound_at is
    permanently null for these unless they actually write back."""
    candidates = (
        await db.execute(
            select(Lead).where(
                Lead.source == "outbound",
                Lead.pipeline_stage.notin_(["won", "lost"]),
                Lead.last_outbound_at.is_not(None),
                Lead.last_inbound_at.is_(None),
            )
        )
    ).scalars().all()

    closed = 0
    for lead in candidates:
        try:
            age = now - lead.last_outbound_at.replace(tzinfo=timezone.utc)
            if age <= CLOSE_OUTBOUND_AFTER:
                continue
            lead.status = "rejected"
            lead.pipeline_stage = "lost"
            db.add(
                AgentAction(
                    lead_id=lead.id,
                    organization_id=lead.organization_id,
                    action_type="updated_pipeline_stage",
                    reasoning=f"No reply to our outbound outreach after {CLOSE_OUTBOUND_AFTER.days} days — closing this conversation",
                )
            )
            closed += 1
            await db.commit()
        except Exception:
            logger.exception("close_stale_outbound_leads failed for lead_id=%s — continuing with the rest", lead.id)
            await db.rollback()
    return closed


async def follow_up_sweep_once(db) -> dict:
    """One pass over eligible leads. Returns counts for logging/testing — kept as a
    plain function (not just the loop) so it can be invoked directly in a test/script
    without waiting for the real 15-minute interval."""
    now = datetime.now(timezone.utc)
    candidates = (
        await db.execute(
            select(Lead).where(
                Lead.pipeline_stage.notin_(["won", "lost"]),
                Lead.temperature != "cold",
                Lead.last_inbound_at.is_not(None),
            )
        )
    ).scalars().all()

    followed_up, marked_cold = 0, 0
    for lead in candidates:
        try:
            age = now - lead.last_inbound_at.replace(tzinfo=timezone.utc)
            if age > FOLLOW_UP_AFTER and lead.follow_up_count == 0:
                channel = await _send_follow_up(lead)
                if channel is None:
                    continue
                conversation = (
                    await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))
                ).scalar_one_or_none()
                if conversation:
                    db.add(Message(conversation_id=conversation.id, role="agent", content=FOLLOW_UP_MESSAGE.format(name=lead.contact_name), channel=channel, message_metadata={"stage": "follow_up"}))
                lead.follow_up_count = 1
                lead.last_outbound_at = now
                lead.next_follow_up_at = lead.last_inbound_at.replace(tzinfo=timezone.utc) + COLD_AFTER
                db.add(AgentAction(lead_id=lead.id, organization_id=lead.organization_id, action_type="followed_up", reasoning=f"No reply after 24h — sent a follow-up via {channel}"))
                followed_up += 1
                await db.commit()

            elif age > COLD_AFTER and lead.follow_up_count == 1:
                lead.temperature = "cold"
                lead.next_follow_up_at = None
                db.add(AgentAction(lead_id=lead.id, organization_id=lead.organization_id, action_type="marked_cold", reasoning="No reply after a follow-up — marked cold"))
                owner_email = await _org_owner_email(lead.organization_id)
                if owner_email:
                    notification = Notification(organization_id=lead.organization_id, lead_id=lead.id, type="lead_cold", channel="email", status="pending", payload={"leadName": lead.contact_name})
                    db.add(notification)
                    await db.flush()
                    sent = await send_email(owner_email, f"LeadPilot: {lead.contact_name} went cold", f"{lead.contact_name} hasn't replied since the follow-up — marking cold.")
                    notification.status = "sent" if sent else "failed"
                    notification.sent_at = now if sent else None
                marked_cold += 1
                await db.commit()
        except Exception:
            logger.exception("follow_up_sweep failed for lead_id=%s — continuing with the rest", lead.id)
            await db.rollback()

    closed_outbound = await _close_stale_outbound_leads(db, now)

    return {"followed_up": followed_up, "marked_cold": marked_cold, "closed_outbound": closed_outbound, "candidates": len(candidates)}


async def follow_up_sweep_loop() -> None:
    while True:
        try:
            async with SessionLocal() as db:
                result = await follow_up_sweep_once(db)
                if result["followed_up"] or result["marked_cold"] or result["closed_outbound"]:
                    logger.info("follow_up_sweep: %s", result)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("follow_up_sweep_loop iteration crashed — retrying next interval")
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
