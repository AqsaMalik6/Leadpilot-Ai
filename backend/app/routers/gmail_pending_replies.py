"""Approve/reject surface for AgentConfig.gmail_reply_mode="review_first" — see
app/jobs/gmail_poll.py's _deliver_or_hold_reply, which is the only writer of
GmailPendingReply rows."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models.gmail import GmailAccount
from app.models.gmail_pending_reply import GmailPendingReply
from app.models.user import User
from app.services.gmail_service import refresh_and_store_if_needed, send_reply

logger = logging.getLogger("leadpilot.gmail_pending_replies")
router = APIRouter(prefix="/api/gmail/pending-replies", tags=["gmail-pending-replies"])


def _to_dict(r: GmailPendingReply) -> dict:
    return {
        "id": str(r.id),
        "leadId": str(r.lead_id),
        "toEmail": r.to_email,
        "subject": r.subject,
        "bodyText": r.body_text,
        "status": r.status,
        "createdAt": r.created_at.isoformat(),
    }


@router.get("")
async def list_pending_replies(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(GmailPendingReply)
            .where(GmailPendingReply.organization_id == user.organization_id, GmailPendingReply.status == "pending")
            .order_by(GmailPendingReply.created_at.desc())
        )
    ).scalars().all()
    return {"pendingReplies": [_to_dict(r) for r in rows]}


async def _get_pending(reply_id: str, user: User, db: AsyncSession) -> GmailPendingReply:
    reply = (
        await db.execute(
            select(GmailPendingReply).where(GmailPendingReply.id == reply_id, GmailPendingReply.organization_id == user.organization_id)
        )
    ).scalar_one_or_none()
    if reply is None:
        raise HTTPException(status_code=404, detail="Pending reply not found")
    if reply.status != "pending":
        raise HTTPException(status_code=409, detail=f"Already {reply.status}")
    return reply


@router.post("/{reply_id}/approve")
async def approve_pending_reply(reply_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    reply = await _get_pending(reply_id, user, db)
    account = (await db.execute(select(GmailAccount).where(GmailAccount.id == reply.gmail_account_id))).scalar_one()

    creds = await refresh_and_store_if_needed(account, db)
    sent = send_reply(creds, reply.to_email, reply.subject, reply.body_text, reply.gmail_thread_id)
    reply.status = "approved"
    reply.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "sent": sent}


@router.post("/{reply_id}/reject")
async def reject_pending_reply(reply_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    reply = await _get_pending(reply_id, user, db)
    reply.status = "rejected"
    reply.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}
