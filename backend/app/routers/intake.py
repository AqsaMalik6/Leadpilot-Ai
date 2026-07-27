"""Lead intake — public-facing, unauthenticated, rate-limited (SKILL-BACKEND.md §2.3).

/api/intake/web-form/{form_key} is Phase 1 (live). The WhatsApp/email webhooks are
Phase 2 per the edited MVP scope note ("WhatsApp + email intake channels") — both are
real, working parsers for their respective provider payload shapes; what's genuinely
untestable without a live account is the *outbound* send half (app/services/
whatsapp_service.py, email replies), which already falls back to a console/log
provider rather than failing.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.pipeline import process_incoming_reply, process_new_lead
from app.config import get_settings
from app.core.rate_limit import check_rate_limit
from app.db import get_db
from app.models.lead import Conversation, Lead, LeadChannel, Message

router = APIRouter(prefix="/api/intake", tags=["intake"])


class WebFormIntakeInput(BaseModel):
    name: str
    email: EmailStr | None = None
    phone: str | None = None
    message: str


@router.post("/web-form/{form_key}", status_code=202)
async def web_form_intake(form_key: str, payload: WebFormIntakeInput, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    check_rate_limit(f"web-form:{request.client.host if request.client else 'unknown'}")

    channel = (
        await db.execute(
            select(LeadChannel).where(LeadChannel.channel_type == "website_form", LeadChannel.is_active.is_(True))
        )
    ).scalars().all()
    matched = next((c for c in channel if c.config.get("form_key") == form_key), None)
    if matched is None:
        raise HTTPException(status_code=404, detail="Unknown form_key")

    lead = Lead(
        organization_id=matched.organization_id,
        channel_id=matched.id,
        source="website_form",
        contact_name=payload.name,
        contact_email=payload.email,
        contact_phone=payload.phone,
        status="new",
        qualification_answers=[],
    )
    db.add(lead)
    await db.flush()
    conversation = Conversation(lead_id=lead.id, status="active")
    db.add(conversation)
    await db.flush()
    db.add(Message(conversation_id=conversation.id, role="lead", content=payload.message, channel="website_form", message_metadata={}))
    await db.commit()

    background_tasks.add_task(process_new_lead, lead.id)
    return {"accepted": True, "leadId": str(lead.id)}


@router.post("/whatsapp/webhook", status_code=202)
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Real parser for the WhatsApp Cloud API webhook payload shape. Phase 2 — see
    module docstring on what's genuinely live vs. console-fallback.

    SKILL-DIGITAL-FTE-UPGRADE.md §4 — feature-flagged via settings.whatsapp_channel_enabled
    rather than a commented-out router include (there's no standalone whatsapp_router;
    this endpoint lives in the same file as web-form/email intake). Kept ON by default in
    this project since WhatsApp is already real and verified working here."""
    if not get_settings().whatsapp_channel_enabled:
        raise HTTPException(status_code=503, detail="WhatsApp channel is currently disabled")
    body = await request.json()
    try:
        entry = body["entry"][0]
        change = entry["changes"][0]["value"]
        message = change["messages"][0]
        from_phone = message["from"]
        text = message.get("text", {}).get("body", "")
        contact_name = change.get("contacts", [{}])[0].get("profile", {}).get("name", from_phone)
    except (KeyError, IndexError):
        return {"accepted": False, "reason": "no message payload"}

    check_rate_limit(f"whatsapp:{from_phone}")

    existing_lead = (
        await db.execute(select(Lead).where(Lead.contact_phone == from_phone, Lead.status == "new").order_by(Lead.created_at.desc()))
    ).scalars().first()

    if existing_lead:
        background_tasks.add_task(process_incoming_reply, existing_lead.id, text)
        return {"accepted": True, "leadId": str(existing_lead.id)}

    channel = (
        await db.execute(select(LeadChannel).where(LeadChannel.channel_type == "whatsapp", LeadChannel.is_active.is_(True)))
    ).scalars().first()
    if channel is None:
        raise HTTPException(status_code=404, detail="No active WhatsApp channel configured")

    lead = Lead(organization_id=channel.organization_id, channel_id=channel.id, source="whatsapp", contact_name=contact_name, contact_phone=from_phone, status="new", qualification_answers=[])
    db.add(lead)
    await db.flush()
    conversation = Conversation(lead_id=lead.id, status="active")
    db.add(conversation)
    await db.flush()
    db.add(Message(conversation_id=conversation.id, role="lead", content=text, channel="whatsapp", message_metadata={}))
    await db.commit()

    background_tasks.add_task(process_new_lead, lead.id)
    return {"accepted": True, "leadId": str(lead.id)}


class InboundEmailPayload(BaseModel):
    """Common-denominator shape across inbound-parse providers (Postmark/SendGrid-style)."""

    from_email: EmailStr
    from_name: str | None = None
    subject: str = ""
    text: str


@router.post("/email/webhook", status_code=202)
async def email_webhook(payload: InboundEmailPayload, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    check_rate_limit(f"email:{payload.from_email}")

    existing_lead = (
        await db.execute(select(Lead).where(Lead.contact_email == payload.from_email, Lead.status == "new").order_by(Lead.created_at.desc()))
    ).scalars().first()

    if existing_lead:
        background_tasks.add_task(process_incoming_reply, existing_lead.id, payload.text)
        return {"accepted": True, "leadId": str(existing_lead.id)}

    channel = (
        await db.execute(select(LeadChannel).where(LeadChannel.channel_type == "email", LeadChannel.is_active.is_(True)))
    ).scalars().first()
    if channel is None:
        raise HTTPException(status_code=404, detail="No active email channel configured")

    lead = Lead(organization_id=channel.organization_id, channel_id=channel.id, source="email", contact_name=payload.from_name or payload.from_email, contact_email=payload.from_email, status="new", qualification_answers=[])
    db.add(lead)
    await db.flush()
    conversation = Conversation(lead_id=lead.id, status="active")
    db.add(conversation)
    await db.flush()
    db.add(Message(conversation_id=conversation.id, role="lead", content=f"{payload.subject}\n\n{payload.text}", channel="email", message_metadata={}))
    await db.commit()

    background_tasks.add_task(process_new_lead, lead.id)
    return {"accepted": True, "leadId": str(lead.id)}
