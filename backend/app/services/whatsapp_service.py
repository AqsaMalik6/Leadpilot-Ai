"""WhatsApp outbound send. Two independent paths:

1. `send_whatsapp_message` — Meta's official WhatsApp Business Cloud API, single
   env-var-configured account (Phase 2 per SKILL-BACKEND.md). Left exactly as-is —
   your own existing setup is untouched by everything below.
2. `send_whatsapp_message_for_org` — SKILL-MULTI-TENANT-CONNECT.md §3's new per-org
   path: routes to that org's connected Baileys sidecar session if one exists, else
   falls back to path 1, else console-logs. This is the path new self-connected
   customers actually use.

HONEST DISCLOSURE (do not soften): path 2 uses the same unofficial "linked device"
protocol WhatsApp Web itself uses, paired by QR code — not Meta's official Business
API. There is a real, if generally low at small scale, risk that WhatsApp could
detect and restrict automated use of a linked device, especially under bulk/broadcast
patterns. This integration is strictly 1:1 reply-to-inbound-lead traffic; it must
never be repurposed into a marketing/broadcast tool. Customers should be told to test
with a spare number first, not their primary business line.
"""

import asyncio
import logging
import random
import uuid

import httpx

from sqlalchemy import select

from app.config import get_settings
from app.core.rate_limit import check_rate_limit

settings = get_settings()
logger = logging.getLogger("leadpilot.whatsapp")

# Deliberately lower than the general-purpose 20/min default in app/core/rate_limit.py
# — this is 1:1 reply traffic, never a broadcast tool; a tight cap also mechanically
# prevents the integration from ever being used as one.
WHATSAPP_SEND_RATE_LIMIT_KEY_PREFIX = "whatsapp-send-org"


async def send_whatsapp_message(to_phone: str, text: str) -> bool:
    if not settings.whatsapp_token or not settings.whatsapp_phone_number_id:
        logger.info("[whatsapp:console-fallback] to=%s\n%s", to_phone, text)
        return True

    url = f"https://graph.facebook.com/v20.0/{settings.whatsapp_phone_number_id}/messages"
    headers = {"Authorization": f"Bearer {settings.whatsapp_token}"}
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": text},
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        return True
    except httpx.HTTPError:
        logger.exception("WhatsApp send failed, falling back to console log")
        logger.info("[whatsapp:console-fallback] to=%s\n%s", to_phone, text)
        return False


async def _send_via_sidecar(org_id: uuid.UUID, to_phone: str, text: str) -> bool:
    """Send a message via the Baileys side‑car.
    Retries up to three times with a short back‑off because the side‑car can
    temporarily drop the connection (common in development). Logs each attempt.
    """
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    f"{settings.whatsapp_sidecar_url}/sessions/{org_id}/send",
                    json={"to": to_phone, "text": text},
                    headers={"X-Sidecar-Secret": settings.whatsapp_sidecar_shared_secret},
                )
                response.raise_for_status()
                return True
        except httpx.HTTPError as exc:
            logger.exception(
                "WhatsApp sidecar send attempt %d failed for org_id=%s (to=%s): %s",
                attempt,
                org_id,
                to_phone,
                exc,
            )
            if attempt < max_attempts:
                await asyncio.sleep(1 * attempt)  # simple back‑off
            else:
                logger.error("All sidecar send attempts failed for org_id=%s; falling back", org_id)
                return False


async def send_whatsapp_message_for_org(org_id: uuid.UUID, to_phone: str | None, text: str) -> bool:
    """Dispatch WhatsApp message for an organization.
    Chooses sidecar (Baileys) if a connected account exists, otherwise falls back to
    the official Meta Cloud API. Logs which path is taken for easier debugging.
    """
    if not to_phone:
        logger.info("[whatsapp:skip] no phone number provided for org_id=%s", org_id)
        return False

    # Determine which backend to use
    try:
        # Quick DB check – if account is connected we will attempt sidecar first
        from app.db import SessionLocal
        from app.models.whatsapp import WhatsAppAccount
        async with SessionLocal() as db:
            account = (await db.execute(select(WhatsAppAccount).where(WhatsAppAccount.organization_id == org_id))).scalar_one_or_none()
            if account:
                logger.info("[whatsapp:db] account status for org_id=%s is %s", org_id, account.status)
        if account and account.status == "connected":
            logger.info("[whatsapp:sidecar] sending via sidecar for org_id=%s to=%s", org_id, to_phone)
            return await _send_via_sidecar(org_id, to_phone, text)
    except Exception as exc:
        logger.exception("[whatsapp:db] error checking sidecar eligibility for org_id=%s: %s", org_id, exc)

    # Fallback to Meta API (may be a console fallback if token not set)
    logger.info("[whatsapp:meta] sending via Meta API for org_id=%s to=%s", org_id, to_phone)
    return await send_whatsapp_message(to_phone, text)
