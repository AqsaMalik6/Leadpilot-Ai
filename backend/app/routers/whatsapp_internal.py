"""SKILL-MULTI-TENANT-CONNECT.md §3 — internal API the whatsapp_sidecar (Node/Baileys
process) calls into. Never exposed publicly (localhost-only in dev; stays on a
private network once deployed) — protected by a shared-secret header instead of the
session-cookie dependency every customer-facing router uses, since the sidecar has no
session of its own.
"""

import hmac
import logging
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.pipeline import classify_is_lead, process_incoming_reply, process_new_lead
from app.agent.reply_capture import agent_message_ids, combined_new_reply_text, reopen_rejected_lead_if_needed
from app.config import get_settings
from app.core.encryption import decrypt_credentials, encrypt_credentials
from app.db import get_db
from app.models.lead import Conversation, Lead, Message
from app.models.whatsapp import WhatsAppAccount
from app.services.whatsapp_service import send_whatsapp_message_for_org

logger = logging.getLogger("leadpilot.whatsapp_internal")
settings = get_settings()
router = APIRouter(prefix="/api/internal/whatsapp", tags=["whatsapp-internal"])


async def verify_sidecar_secret(x_sidecar_secret: str | None = Header(default=None)):
    if not settings.whatsapp_sidecar_shared_secret or not x_sidecar_secret or not hmac.compare_digest(
        x_sidecar_secret, settings.whatsapp_sidecar_shared_secret
    ):
        raise HTTPException(status_code=401, detail="Invalid or missing sidecar secret")


async def _get_or_404(db: AsyncSession, org_id: uuid.UUID) -> WhatsAppAccount:
    account = (await db.execute(select(WhatsAppAccount).where(WhatsAppAccount.organization_id == org_id))).scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="No whatsapp_accounts row for this org — call /connect first")
    return account


@router.get("/connected-orgs", dependencies=[Depends(verify_sidecar_secret)])
async def connected_orgs(db: AsyncSession = Depends(get_db)):
    """Called once by the sidecar on its own boot — every org whose DB status is
    still 'connected' gets its session auto-resumed from stored creds immediately,
    so a sidecar restart (crash, redeploy, `--watch` reload, or simply restarting the
    backend if habit means restarting this alongside it) never requires re-scanning a
    QR code. The backend restarting on its own never touches this at all — the live
    socket lives entirely in the sidecar process, untouched by a Python reload."""
    rows = (await db.execute(select(WhatsAppAccount.organization_id).where(WhatsAppAccount.status == "connected"))).scalars().all()
    return {"organizationIds": [str(org_id) for org_id in rows]}


@router.get("/{org_id}/auth-state", dependencies=[Depends(verify_sidecar_secret)])
async def get_auth_state(org_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    account = await _get_or_404(db, org_id)
    if not account.auth_state_encrypted:
        raise HTTPException(status_code=404, detail="No stored auth state yet")
    return {"authState": decrypt_credentials(account.auth_state_encrypted)}


@router.put("/{org_id}/auth-state", dependencies=[Depends(verify_sidecar_secret)])
async def put_auth_state(org_id: uuid.UUID, payload: dict, db: AsyncSession = Depends(get_db)):
    account = await _get_or_404(db, org_id)
    account.auth_state_encrypted = encrypt_credentials(payload["authState"])
    await db.commit()
    return {"ok": True}


@router.delete("/{org_id}/auth-state", dependencies=[Depends(verify_sidecar_secret)])
async def delete_auth_state(org_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    account = await _get_or_404(db, org_id)
    account.auth_state_encrypted = None
    await db.commit()
    return {"ok": True}


@router.post("/{org_id}/status", dependencies=[Depends(verify_sidecar_secret)])
async def post_status(org_id: uuid.UUID, payload: dict, db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone

    account = await _get_or_404(db, org_id)
    new_status = payload.get("state")
    if new_status:
        account.status = new_status
    if payload.get("qr") is not None:
        account.qr_code_data_url = payload["qr"]
    if payload.get("phoneNumber"):
        account.phone_number = payload["phoneNumber"]
    if payload.get("error"):
        account.last_status_message = payload["error"]
    if new_status == "connected":
        account.last_connected_at = datetime.now(timezone.utc)
        account.reconnect_attempts = 0
        account.qr_code_data_url = None
    await db.commit()
    return {"ok": True}


@router.post("/{org_id}/inbound", dependencies=[Depends(verify_sidecar_secret)])
async def inbound_message(org_id: uuid.UUID, payload: dict, db: AsyncSession = Depends(get_db)):
    """Mirrors app/jobs/gmail_poll.py's _process_account routing exactly — same
    classify_is_lead spam gate for brand-new senders, same lead/conversation/message
    creation shape, same process_new_lead/process_incoming_reply pipeline calls
    (org-scoped entirely inside those functions already, zero pipeline changes needed)
    — then actually sends the combined reply back out, closing the gap where WhatsApp
    inbound used to just write a Message row with nothing ever sent to the lead's phone.
    """
    from_phone = payload.get("from")
    from_name = payload.get("fromName") or from_phone
    text = (payload.get("text") or "").strip()
    wa_message_id = payload.get("waMessageId")
    if not from_phone or not text:
        return {"ok": True, "skipped": "empty from/text"}

    account = await _get_or_404(db, org_id)
    if account.phone_number and from_phone == account.phone_number:
        logger.info("whatsapp_internal: skipping self-sent message (from == connected number) for org_id=%s", org_id)
        return {"ok": True, "skipped": "self"}

    # Idempotency guard: Baileys can redeliver the same message on reconnect, and this
    # also protects against ever accidentally running two backend processes against the
    # same org (each would otherwise turn one real WhatsApp message into two leads and
    # two Groq calls). Real duplicate-processing was observed and fixed by this exact
    # symptom during development.
    if wa_message_id:
        already_processed = (
            await db.execute(select(Message.id).where(Message.message_metadata["wa_message_id"].astext == wa_message_id))
        ).scalar_one_or_none()
        if already_processed:
            logger.info("whatsapp_internal: skipping already-processed wa_message_id=%s for org_id=%s", wa_message_id, org_id)
            return {"ok": True, "skipped": "duplicate"}

    existing_lead = (
        await db.execute(
            select(Lead).where(Lead.organization_id == org_id, Lead.contact_phone == from_phone, Lead.status.in_(["new", "rejected"]))
        )
    ).scalars().first()
    if existing_lead:
        await reopen_rejected_lead_if_needed(db, existing_lead)

    if not existing_lead:
        is_lead = await classify_is_lead(text)
        if not is_lead:
            return {"ok": True, "skipped": "not_a_lead"}

    if existing_lead:
        conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == existing_lead.id))).scalar_one()
        before_ids = await agent_message_ids(db, conversation.id)
        # process_incoming_reply persists the inbound message itself — do NOT also add
        # it here, or the same reply shows up twice in the conversation transcript.
        await process_incoming_reply(existing_lead.id, text, metadata={"wa_message_id": wa_message_id})
        combined = await combined_new_reply_text(db, conversation.id, before_ids)
        if combined:
            await send_whatsapp_message_for_org(org_id, from_phone, combined)
    else:
        lead = Lead(organization_id=org_id, source="whatsapp", contact_name=from_name, contact_phone=from_phone, status="new", qualification_answers=[])
        db.add(lead)
        await db.flush()
        conversation = Conversation(lead_id=lead.id, status="active")
        db.add(conversation)
        await db.flush()
        db.add(Message(conversation_id=conversation.id, role="lead", content=text, channel="whatsapp", message_metadata={"wa_message_id": wa_message_id}))
        await db.commit()

        before_ids = await agent_message_ids(db, conversation.id)
        await process_new_lead(lead.id)
        combined = await combined_new_reply_text(db, conversation.id, before_ids)
        if combined:
            await send_whatsapp_message_for_org(org_id, from_phone, combined)

    return {"ok": True}
