import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_action import AgentAction
from app.models.calendly_event import CalendlyBookingEvent
from app.models.gmail import GmailAccount
from app.models.gmail_pending_reply import GmailPendingReply
from app.models.lead import Conversation, Lead, Message
from app.models.notification import Notification
from app.models.outbound_lead import OutboundLead
from app.models.proposal import Proposal
from app.models.user import User
from app.realtime import subscribe
from app.schemas.lead import Lead as LeadSchema
from app.schemas.lead import LeadListItem, Qualification, QualificationAnswer, TranscriptMessage
from app.services.proposal_service import generate_proposal_draft

# SKILL-DIGITAL-FTE-UPGRADE.md §6 — one-directional sync so a manual status change also
# nudges pipeline_stage to a matching-or-further stage, without ever pulling it backwards.
_STATUS_TO_MIN_PIPELINE_STAGE = {"new": "new", "qualified": "qualified", "booked": "meeting_scheduled", "rejected": "lost"}
_PIPELINE_STAGE_ORDER = ["new", "contacted", "qualified", "meeting_scheduled", "proposal_sent", "won", "lost"]

# Extra grace period past the meeting's own scheduled end time before the lead detail
# page's "Meeting ended — what's the outcome?" banner appears — avoids nagging the
# moment the calendar slot closes, in case the call is still genuinely wrapping up.
_MEETING_END_BUFFER = timedelta(minutes=30)

router = APIRouter(prefix="/api/leads", tags=["leads"])


def _meeting_ended_pending_outcome(lead: Lead) -> bool:
    if lead.pipeline_stage != "meeting_scheduled" or lead.meeting_scheduled_at is None:
        return False
    duration = lead.meeting_duration_minutes or 30
    meeting_end = lead.meeting_scheduled_at.replace(tzinfo=timezone.utc) + timedelta(minutes=duration)
    return datetime.now(timezone.utc) > meeting_end + _MEETING_END_BUFFER


def _channel_or_website(source: str) -> str:
    """The frontend's ChannelSchema (and this backend's own LeadListItem/Lead
    Literal) only know website_form/whatsapp/email/gmail — demo_sandbox and
    outbound are Lead.source-only provenance markers, not real channels a message
    was ever exchanged over, so both collapse to a real channel value here rather
    than leaking straight through and failing validation (real bug, real 500 on
    every /api/leads call once a single outbound-sourced lead exists)."""
    if source in ("demo_sandbox",):
        return "website_form"
    if source == "outbound":
        return "email"
    return source


def _to_list_item(lead: Lead) -> LeadListItem:
    return LeadListItem(
        id=str(lead.id),
        name=lead.contact_name,
        company=None,
        email=lead.contact_email,
        phone=lead.contact_phone,
        channel=_channel_or_website(lead.source),
        status=lead.status,
        created_at=lead.created_at,
        responded_at=lead.responded_at,
        response_time_seconds=lead.response_time_seconds,
        calendly_booking_url=lead.calendly_booking_url,
        booked_at=lead.booked_at,
        rejection_reason=lead.rejection_reason,
        is_live=not lead.is_demo,
        qualification_score=lead.qualification_score,
        pipeline_stage=lead.pipeline_stage,
        temperature=lead.temperature,
        follow_up_count=lead.follow_up_count,
        next_follow_up_at=lead.next_follow_up_at,
    )


async def _lead_to_schema(db: AsyncSession, lead: Lead) -> LeadSchema:
    conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))).scalar_one_or_none()
    transcript: list[TranscriptMessage] = []
    if conversation:
        messages = (
            await db.execute(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at))
        ).scalars().all()
        transcript = [
            TranscriptMessage(id=str(m.id), role=m.role, text=m.content, timestamp=m.created_at)
            for m in messages
        ]

    answers = [QualificationAnswer(**a) for a in (lead.qualification_answers or [])]
    qualification = Qualification(
        budget=lead.budget,
        timeline=lead.timeline,
        need=lead.need,
        company_size=lead.company_size,
        decision_authority=lead.decision_authority,
        answers=answers,
        score=lead.qualification_score,
    )

    return LeadSchema(
        id=str(lead.id),
        name=lead.contact_name,
        company=None,
        email=lead.contact_email,
        phone=lead.contact_phone,
        channel=_channel_or_website(lead.source),
        status=lead.status,
        created_at=lead.created_at,
        responded_at=lead.responded_at,
        response_time_seconds=lead.response_time_seconds,
        transcript=transcript,
        qualification=qualification,
        calendly_booking_url=lead.calendly_booking_url,
        booked_at=lead.booked_at,
        rejection_reason=lead.rejection_reason,
        is_live=not lead.is_demo,
        pipeline_stage=lead.pipeline_stage,
        temperature=lead.temperature,
        follow_up_count=lead.follow_up_count,
        next_follow_up_at=lead.next_follow_up_at,
        meeting_scheduled_at=lead.meeting_scheduled_at,
        meeting_duration_minutes=lead.meeting_duration_minutes,
        meeting_transcript=lead.meeting_transcript,
        meeting_ended_pending_outcome=_meeting_ended_pending_outcome(lead),
    )


@router.get("")
async def list_leads(
    status_filter: str | None = Query(default=None, alias="status"),
    channel: str | None = Query(default=None),
    search: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Lead).where(Lead.organization_id == user.organization_id)
    if status_filter:
        query = query.where(Lead.status == status_filter)
    if channel:
        query = query.where(Lead.source == channel)
    query = query.order_by(Lead.created_at.desc())
    leads = (await db.execute(query)).scalars().all()

    if search:
        needle = search.lower()
        leads = [
            l for l in leads
            if needle in (l.contact_name or "").lower()
            or needle in (l.contact_email or "").lower()
        ]

    return {"leads": [_to_list_item(l) for l in leads]}


@router.get("/stream")
async def stream_leads(user: User = Depends(get_current_user)):
    async def event_generator():
        async with subscribe(user.organization_id) as queue:
            heartbeat_task = asyncio.create_task(_heartbeat_loop(queue))
            try:
                while True:
                    event = await queue.get()
                    yield f"data: {json.dumps(event)}\n\n"
            finally:
                heartbeat_task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache, no-transform", "Connection": "keep-alive"},
    )


async def _heartbeat_loop(queue: asyncio.Queue) -> None:
    while True:
        await asyncio.sleep(15)
        await queue.put({"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()})


@router.get("/{lead_id}")
async def get_lead(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    return {"lead": await _lead_to_schema(db, lead)}


@router.delete("/{lead_id}")
async def delete_lead(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Permanently removes a lead and its whole conversation — the dashboard's per-row
    delete icon, for ending a test/dead conversation so a fresh message from the same
    contact starts a brand-new lead instead of reopening this one. No FK cascade is
    configured at the DB level, so dependent rows are deleted in dependency order
    (children before the lead itself) rather than relying on ON DELETE CASCADE."""
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")

    # A lead promoted from an outbound search (outbound_leads.promoted_lead_id) FK's
    # straight to this row — deleting the lead without clearing that reference first
    # violates outbound_leads_promoted_lead_id_fkey (real bug, hit as soon as any
    # outbound-promoted lead was deleted from the dashboard). Reset it back to "found"
    # rather than deleting the outbound_leads row itself, so it's simply available to
    # re-add to the pipeline again instead of disappearing from outbound history.
    await db.execute(
        OutboundLead.__table__.update()
        .where(OutboundLead.promoted_lead_id == lead.id)
        .values(promoted_lead_id=None, status="found")
    )
    conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))).scalar_one_or_none()
    if conversation is not None:
        await db.execute(Message.__table__.delete().where(Message.conversation_id == conversation.id))
    await db.execute(AgentAction.__table__.delete().where(AgentAction.lead_id == lead.id))
    await db.execute(Proposal.__table__.delete().where(Proposal.lead_id == lead.id))
    await db.execute(Notification.__table__.delete().where(Notification.lead_id == lead.id))
    await db.execute(CalendlyBookingEvent.__table__.delete().where(CalendlyBookingEvent.lead_id == lead.id))
    await db.execute(GmailPendingReply.__table__.delete().where(GmailPendingReply.lead_id == lead.id))
    if conversation is not None:
        await db.execute(Conversation.__table__.delete().where(Conversation.id == conversation.id))
    await db.execute(Lead.__table__.delete().where(Lead.id == lead.id))
    await db.commit()

    from app.realtime import publish_event

    await publish_event(user.organization_id, {"type": "lead_deleted", "lead_id": str(lead.id)})
    return {"ok": True}


@router.post("/{lead_id}/status")
async def update_status(lead_id: str, payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    new_status = payload.get("status")
    if new_status not in ("new", "qualified", "booked", "rejected"):
        return {"ok": False, "errors": {"formErrors": ["Invalid status"], "fieldErrors": {}}}

    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")

    lead.status = new_status
    if new_status == "booked" and lead.booked_at is None:
        lead.booked_at = datetime.now(timezone.utc)

    # SKILL-DIGITAL-FTE-UPGRADE.md §6/§7 — manual dashboard overrides log an agent_actions
    # row (so the AI reasoning feed shows it was a human change, not the agent's own
    # decision) and nudge pipeline_stage forward to stay roughly in sync, never backwards.
    min_stage = _STATUS_TO_MIN_PIPELINE_STAGE[new_status]
    if _PIPELINE_STAGE_ORDER.index(min_stage) > _PIPELINE_STAGE_ORDER.index(lead.pipeline_stage):
        lead.pipeline_stage = min_stage
    db.add(
        AgentAction(
            lead_id=lead.id,
            organization_id=user.organization_id,
            action_type="manual_override",
            reasoning=f"{user.full_name or user.email} manually set status to {new_status}",
        )
    )
    await db.commit()

    from app.realtime import publish_event

    await publish_event(user.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": new_status})
    return {"ok": True}


@router.get("/{lead_id}/actions")
async def get_lead_actions(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """SKILL-DIGITAL-FTE-UPGRADE.md §7 — backs the dashboard's AI reasoning feed."""
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")

    actions = (
        await db.execute(
            select(AgentAction).where(AgentAction.lead_id == lead_id).order_by(AgentAction.created_at.desc())
        )
    ).scalars().all()
    return {
        "actions": [
            {
                "id": str(a.id),
                "actionType": a.action_type,
                "reasoning": a.reasoning,
                "createdAt": a.created_at.isoformat(),
            }
            for a in actions
        ]
    }


def _proposal_to_dict(p: Proposal) -> dict:
    return {
        "id": str(p.id),
        "subject": p.subject,
        "body": p.body,
        "status": p.status,
        "createdAt": p.created_at.isoformat(),
        "sentAt": p.sent_at.isoformat() if p.sent_at else None,
    }


@router.get("/{lead_id}/proposal")
async def get_proposal(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    proposal = (await db.execute(select(Proposal).where(Proposal.lead_id == lead_id))).scalar_one_or_none()
    return {"proposal": _proposal_to_dict(proposal) if proposal else None}


@router.put("/{lead_id}/meeting-transcript")
async def set_meeting_transcript(lead_id: str, payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """No call-recording/transcription integration exists, so this is a human-pasted
    transcript/notes field — generate_proposal_draft reads it to ground the proposal in
    what was actually discussed in the meeting, not just the pre-meeting chat."""
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    lead.meeting_transcript = payload.get("transcript") or None
    await db.commit()
    return {"ok": True}


@router.post("/{lead_id}/proposal/generate")
async def generate_proposal(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Digital FTE flow step 4a: 'AI proposal generate kare' — a draft only, never sent
    without a human approving it in the next step."""
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")

    subject, body = await generate_proposal_draft(db, lead)

    proposal = (await db.execute(select(Proposal).where(Proposal.lead_id == lead_id))).scalar_one_or_none()
    if proposal is None:
        proposal = Proposal(lead_id=lead.id, organization_id=user.organization_id, subject=subject, body=body, status="draft")
        db.add(proposal)
    else:
        proposal.subject = subject
        proposal.body = body
        proposal.status = "draft"
        proposal.sent_at = None
    db.add(
        AgentAction(
            lead_id=lead.id,
            organization_id=user.organization_id,
            action_type="updated_pipeline_stage",
            reasoning="Drafted a proposal for manager review — not yet sent",
        )
    )
    await db.commit()
    await db.refresh(proposal)
    return {"proposal": _proposal_to_dict(proposal)}


@router.put("/{lead_id}/proposal")
async def edit_proposal(lead_id: str, payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Lets a manager rewrite the AI's draft before approving it — subject/body only,
    only while still a draft (an already-sent proposal is a record of what the client
    actually received, not something to quietly rewrite after the fact)."""
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    proposal = (await db.execute(select(Proposal).where(Proposal.lead_id == lead_id))).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=400, detail="No proposal drafted yet")
    if proposal.status != "draft":
        raise HTTPException(status_code=400, detail="Only a draft proposal can be edited")

    subject = payload.get("subject")
    body = payload.get("body")
    if subject is not None:
        proposal.subject = subject
    if body is not None:
        proposal.body = body
    await db.commit()
    await db.refresh(proposal)
    return {"proposal": _proposal_to_dict(proposal)}


@router.post("/{lead_id}/proposal/approve")
async def approve_proposal(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Digital FTE flow step 4b: 'Manager approve kare' -> 'AI email kare' -> CRM stage
    becomes Proposal Sent. This is the human-in-the-loop gate — nothing reaches the
    client's inbox until a manager clicks this."""
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    proposal = (await db.execute(select(Proposal).where(Proposal.lead_id == lead_id))).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=400, detail="No proposal drafted yet")
    if not lead.contact_email and not lead.contact_phone:
        raise HTTPException(status_code=400, detail="Lead has no email or phone number to send to")

    sent = False
    sent_to = None
    if lead.contact_email:
        sent_to = lead.contact_email
        if lead.source == "gmail":
            gmail_account = (
                await db.execute(select(GmailAccount).where(GmailAccount.organization_id == user.organization_id, GmailAccount.is_active.is_(True)))
            ).scalar_one_or_none()
            if gmail_account is not None:
                from app.services.gmail_service import refresh_and_store_if_needed, send_reply

                creds = await refresh_and_store_if_needed(gmail_account, db)
                sent = send_reply(creds, lead.contact_email, proposal.subject, proposal.body, None)
        if not sent:
            from app.services.email_service import send_email

            sent = await send_email(lead.contact_email, proposal.subject, proposal.body)
    elif lead.contact_phone:
        # WhatsApp-sourced leads (and any other lead reached only by phone) have no
        # contact_email at all — a proposal is real content the lead is waiting on, so
        # it should go out over whichever real channel this lead actually has, not
        # hard-fail just because that channel isn't email.
        from app.services.whatsapp_service import send_whatsapp_message_for_org

        sent_to = lead.contact_phone
        text = f"{proposal.subject}\n\n{proposal.body}" if proposal.subject else proposal.body
        sent = await send_whatsapp_message_for_org(user.organization_id, lead.contact_phone, text)

    conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))).scalar_one_or_none()
    if conversation:
        db.add(Message(conversation_id=conversation.id, role="agent", content=proposal.body, channel=_channel_or_website(lead.source), message_metadata={"stage": "proposal"}))

    proposal.status = "sent"
    proposal.sent_at = datetime.now(timezone.utc)
    lead.pipeline_stage = "proposal_sent"
    lead.last_outbound_at = datetime.now(timezone.utc)
    db.add(
        AgentAction(
            lead_id=lead.id,
            organization_id=user.organization_id,
            action_type="updated_pipeline_stage",
            reasoning=f"{user.full_name or user.email} approved the proposal — sent to {sent_to}"
            + ("" if sent else " (delivery failed, see server logs — fell back to console log)"),
        )
    )
    await db.commit()

    from app.realtime import publish_event

    await publish_event(user.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": lead.status})
    return {"ok": True, "sent": sent, "proposal": _proposal_to_dict(proposal)}


@router.post("/{lead_id}/outcome")
async def set_outcome(lead_id: str, payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Digital FTE flow step 5: the client's decision after the proposal — Won or Lost."""
    outcome = payload.get("outcome")
    if outcome not in ("won", "lost"):
        raise HTTPException(status_code=400, detail="outcome must be 'won' or 'lost'")

    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")

    lead.pipeline_stage = outcome
    lead.status = "booked" if outcome == "won" else "rejected"
    sent = None
    if outcome == "lost":
        lead.rejection_reason = payload.get("reason") or "Client declined the proposal"
        lead.rejected_at = datetime.now(timezone.utc)
        if lead.contact_email:
            from app.services.email_service import send_email

            sent = await send_email(
                lead.contact_email,
                "Update on your inquiry",
                f"Hi {lead.contact_name},\n\nThanks for your time — after reviewing, we won't be moving forward "
                "at this stage. Feel free to reach back out anytime if things change.\n\nBest of luck!",
            )
    db.add(
        AgentAction(
            lead_id=lead.id,
            organization_id=user.organization_id,
            action_type="manual_override",
            reasoning=f"{user.full_name or user.email} marked the deal as {outcome}"
            + (f" — rejection email {'sent' if sent else 'failed (see server logs)'}" if sent is not None else ""),
        )
    )
    await db.commit()

    from app.realtime import publish_event

    await publish_event(user.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": lead.status})
    return {"ok": True, "rejectionEmailSent": sent}


@router.post("/{lead_id}/handoff")
async def handoff(lead_id: str, payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rep_id = payload.get("repId")
    lead = (
        await db.execute(select(Lead).where(Lead.id == lead_id, Lead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")

    lead.assigned_rep_id = uuid.UUID(rep_id) if rep_id else user.id
    conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))).scalar_one_or_none()
    if conversation:
        conversation.status = "handed_off"
    await db.commit()
    return {"ok": True}
