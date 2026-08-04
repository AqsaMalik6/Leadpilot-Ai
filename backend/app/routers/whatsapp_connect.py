"""SKILL-MULTI-TENANT-CONNECT.md §3 — customer-facing WhatsApp connect endpoints.
Disconnect lives in app/routers/integrations.py's existing DELETE /{integration_id}
(already handles the "wa_" id prefix) rather than duplicating it here.

The dashboard never talks to the whatsapp_sidecar directly — only this backend does,
over an internal, shared-secret-protected call (app/routers/whatsapp_internal.py).
Keeps the sidecar off any path a browser could hit."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.whatsapp import WhatsAppAccount

logger = logging.getLogger("leadpilot.whatsapp_connect")
settings = get_settings()
router = APIRouter(prefix="/api/integrations/whatsapp", tags=["whatsapp-connect"])


@router.post("/connect")
async def whatsapp_connect_start(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not settings.whatsapp_sidecar_shared_secret:
        raise HTTPException(status_code=503, detail="WhatsApp connect isn't configured yet — WHATSAPP_SIDECAR_SHARED_SECRET is missing")

    account = (
        await db.execute(select(WhatsAppAccount).where(WhatsAppAccount.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if account is not None and account.status == "connected":
        # The DB can say "connected" while the sidecar has no live session in memory
        # for this org — e.g. the sidecar process restarted (deploy, crash, manual
        # restart) since the last time it posted a status update. Ask the sidecar for
        # the truth instead of trusting the DB blindly: only skip if a real socket is
        # still active. If it isn't, fall through to /start WITHOUT force — Baileys
        # will silently resume from the stored creds (no fresh QR) rather than us
        # needlessly tearing down and re-pairing.
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                status_res = await client.get(
                    f"{settings.whatsapp_sidecar_url}/sessions/{user.organization_id}/status",
                    headers={"X-Sidecar-Secret": settings.whatsapp_sidecar_shared_secret},
                )
                status_res.raise_for_status()
                if status_res.json().get("active"):
                    return {"status": "connected"}
        except httpx.HTTPError:
            logger.warning("Couldn't reach whatsapp_sidecar to verify live session for org_id=%s — will attempt to resume", user.organization_id)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resume_res = await client.post(
                    f"{settings.whatsapp_sidecar_url}/sessions/{user.organization_id}/start",
                    headers={"X-Sidecar-Secret": settings.whatsapp_sidecar_shared_secret},
                )
                resume_res.raise_for_status()
        except httpx.HTTPError:
            logger.exception("Failed to resume whatsapp session for org_id=%s", user.organization_id)
            account.status = "error"
            account.last_status_message = "Couldn't reach the WhatsApp connector service — is it running?"
            await db.commit()
            return {"status": "error", "detail": "WhatsApp connector service unavailable"}
        return {"status": "connected"}
    if account is None:
        account = WhatsAppAccount(organization_id=user.organization_id, status="qr_pending")
        db.add(account)
    else:
        account.status = "qr_pending"
        account.last_status_message = None
        # This button is only ever shown when the dashboard already believes we're
        # NOT truly connected — so clear any previously-stored QR image now. Without
        # this, a customer who clicks Connect while the sidecar's in-memory session is
        # still idempotently no-op'd (see the sidecar's /sessions/:orgId/start) would
        # be shown the OLD, already-expired QR from a prior attempt and scan a code
        # WhatsApp itself has already timed out — the exact "QR looked scanned but my
        # phone said login failed" symptom.
        account.qr_code_data_url = None
    await db.commit()

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.whatsapp_sidecar_url}/sessions/{user.organization_id}/start",
                headers={"X-Sidecar-Secret": settings.whatsapp_sidecar_shared_secret},
                params={"force": "true"},
            )
            response.raise_for_status()
    except httpx.HTTPError:
        logger.exception("Failed to reach whatsapp_sidecar to start a session for org_id=%s", user.organization_id)
        account.status = "error"
        account.last_status_message = "Couldn't reach the WhatsApp connector service — is it running?"
        await db.commit()
        return {"status": "error", "detail": "WhatsApp connector service unavailable"}

    return {"status": "qr_pending"}


@router.get("/qr")
async def whatsapp_connect_qr(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Polled every ~2s by the dashboard while status == qr_pending. Reads purely from
    Postgres — the sidecar posts updates to /api/internal/whatsapp/{org_id}/status,
    it never gets called directly from a request a browser can trigger."""
    account = (
        await db.execute(select(WhatsAppAccount).where(WhatsAppAccount.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if account is None:
        return {"status": "disconnected", "qrCodeDataUrl": None, "phoneNumber": None}
    return {
        "status": account.status,
        "qrCodeDataUrl": account.qr_code_data_url,
        "phoneNumber": account.phone_number,
        "lastStatusMessage": account.last_status_message,
    }
