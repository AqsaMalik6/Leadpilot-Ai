import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import encrypt_credentials
from app.db import get_db
from app.dependencies import get_current_user
from app.models.gmail import GmailAccount
from app.models.integration import Integration
from app.models.lead import LeadChannel
from app.models.user import User
from app.models.whatsapp import WhatsAppAccount

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

_CHANNEL_LABELS = {
    "whatsapp": ("WhatsApp Business", "Reply to inbound WhatsApp inquiries the moment they land."),
}
# "email" (a generic forward-to-webhook inbox) predates the real Gmail OAuth connect
# below and is superseded by it — no connect flow creates this channel type anymore.
# "website_form" removed per product owner: keep only Gmail, WhatsApp, Calendly as
# connectable options — the webhook itself still exists server-side (a website-form
# lead still becomes a real Lead if one ever arrives at the intake endpoint), it's
# just no longer surfaced as a UI option anywhere.
_SUPERSEDED_CHANNEL_TYPES = {"email", "website_form"}
_GMAIL_LABEL = ("Gmail", "Connect your own Gmail inbox so LeadPilot can read and reply to your real leads.")
_WHATSAPP_ACCOUNT_LABEL = ("WhatsApp (QR connect)", "Scan a QR code to link your own WhatsApp number — no Meta Business account needed.")
# Slack/HubSpot removed per product owner: the dashboard's Integrations page should
# only offer connections that actually do something today (Gmail, WhatsApp, Calendly)
# — no "Coming soon" placeholders that can't be clicked into working.
_PROVIDER_LABELS = {
    "calendly": ("Calendly", "Let qualified leads book directly onto your team's calendar."),
}


@router.get("")
async def list_integrations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Composes lead_channels (website_form/whatsapp/email) + integrations
    (calendly) + the Gmail/WhatsApp-QR connect tables into the one flat list the
    frontend's /dashboard/integrations page renders (SKILL-BACKEND.md §1 merged-view
    rule, extended by SKILL-MULTI-TENANT-CONNECT.md §3)."""
    channels = (
        await db.execute(select(LeadChannel).where(LeadChannel.organization_id == user.organization_id))
    ).scalars().all()
    integrations = (
        await db.execute(select(Integration).where(Integration.organization_id == user.organization_id))
    ).scalars().all()

    result = []
    for c in channels:
        if c.channel_type in _SUPERSEDED_CHANNEL_TYPES:
            continue
        label, description = _CHANNEL_LABELS.get(c.channel_type, (c.channel_type, ""))
        result.append(
            {
                "id": f"chan_{c.id}",
                "provider": c.channel_type,
                "label": label,
                "description": description,
                "logoSrc": None,
                "status": "connected" if c.is_active else "not_connected",
                "connectedAt": c.created_at.isoformat() if c.is_active else None,
                "configHref": "/dashboard/integrations",
            }
        )

    connected_providers = {i.provider for i in integrations}
    for i in integrations:
        label, description = _PROVIDER_LABELS.get(i.provider, (i.provider, ""))
        result.append(
            {
                "id": f"int_{i.id}",
                "provider": i.provider,
                "label": label,
                "description": description,
                "logoSrc": None,
                "status": i.status,
                "connectedAt": i.connected_at.isoformat() if i.connected_at else None,
                "configHref": "/dashboard/integrations",
            }
        )
    # Providers with no row yet still show up as "not_connected" placeholders.
    for provider, (label, description) in _PROVIDER_LABELS.items():
        if provider not in connected_providers:
            result.append(
                {
                    "id": f"placeholder_{provider}",
                    "provider": provider,
                    "label": label,
                    "description": description,
                    "logoSrc": None,
                    "status": "not_connected",
                    "connectedAt": None,
                    "configHref": "/dashboard/integrations",
                }
            )

    # SKILL-MULTI-TENANT-CONNECT.md — Gmail/WhatsApp live in their own tables (not
    # lead_channels/integrations), since both carry OAuth/session state those two
    # generic tables were never shaped for. Surfaced here as first-class entries in
    # the same merged list the dashboard already renders.
    gmail_account = (
        await db.execute(select(GmailAccount).where(GmailAccount.organization_id == user.organization_id))
    ).scalar_one_or_none()
    gmail_label, gmail_description = _GMAIL_LABEL
    if gmail_account and gmail_account.is_active:
        gmail_status = "connected"
    elif gmail_account and gmail_account.status == "reconnect_needed":
        gmail_status = "reconnect_needed"
    else:
        gmail_status = "not_connected"
    result.append(
        {
            "id": f"gmail_{gmail_account.id}" if gmail_account else "gmail_placeholder",
            "provider": "gmail",
            "label": gmail_label,
            "description": gmail_description if not gmail_account else f"Connected: {gmail_account.email_address}",
            "logoSrc": None,
            "status": gmail_status,
            "connectedAt": gmail_account.created_at.isoformat() if (gmail_account and gmail_account.is_active) else None,
            "configHref": "/dashboard/integrations",
            "lastSyncedAt": gmail_account.last_synced_at.isoformat() if (gmail_account and gmail_account.last_synced_at) else None,
            "lastStatusMessage": gmail_account.last_status_message if gmail_account else None,
        }
    )

    wa_account = (
        await db.execute(select(WhatsAppAccount).where(WhatsAppAccount.organization_id == user.organization_id))
    ).scalar_one_or_none()
    wa_label, wa_description = _WHATSAPP_ACCOUNT_LABEL
    result.append(
        {
            "id": f"wa_{wa_account.id}" if wa_account else "wa_placeholder",
            "provider": "whatsapp_qr",
            "label": wa_label,
            "description": wa_description if not (wa_account and wa_account.status == "connected") else f"Connected: {wa_account.phone_number}",
            "logoSrc": None,
            "status": wa_account.status if wa_account else "not_connected",
            "connectedAt": wa_account.last_connected_at.isoformat() if (wa_account and wa_account.last_connected_at) else None,
            "configHref": "/dashboard/integrations",
        }
    )

    return {"integrations": result}


@router.post("/calendly/connect")
async def connect_calendly(payload: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Phase 1 — needed for the agent's send_calendly_link tool call. Accepts a
    Calendly personal scheduling link directly (no full OAuth dance) since that's
    all the qualification agent's tool call actually needs."""
    calendly_url = payload.get("calendlyUrl")
    if not calendly_url:
        raise HTTPException(status_code=400, detail="calendlyUrl is required")

    existing = (
        await db.execute(select(Integration).where(Integration.organization_id == user.organization_id, Integration.provider == "calendly"))
    ).scalar_one_or_none()
    if existing is None:
        existing = Integration(organization_id=user.organization_id, provider="calendly")
        db.add(existing)
    existing.credentials_encrypted = encrypt_credentials(calendly_url)
    existing.status = "connected"
    existing.connected_at = datetime.now(timezone.utc)
    await db.commit()

    from app.models.agent_config import AgentConfig

    config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == user.organization_id))).scalar_one()
    config.calendly_link = calendly_url
    await db.commit()
    return {"ok": True}


@router.delete("/{integration_id}")
async def delete_integration(integration_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if integration_id.startswith("gmail_"):
        gmail_account = (
            await db.execute(select(GmailAccount).where(GmailAccount.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if gmail_account:
            # Flips the exact flag gmail_poll_once filters on (`where(is_active.is_(True))`)
            # — the poll loop simply stops picking this account up next cycle.
            gmail_account.is_active = False
            await db.commit()
        return {"ok": True}

    if integration_id.startswith("wa_"):
        wa_account = (
            await db.execute(select(WhatsAppAccount).where(WhatsAppAccount.organization_id == user.organization_id))
        ).scalar_one_or_none()
        if wa_account:
            import httpx

            from app.config import get_settings

            settings = get_settings()
            try:
                async with httpx.AsyncClient(timeout=5) as client:
                    await client.post(
                        f"{settings.whatsapp_sidecar_url}/sessions/{user.organization_id}/logout",
                        headers={"X-Sidecar-Secret": settings.whatsapp_sidecar_shared_secret},
                    )
            except httpx.HTTPError:
                logging.getLogger("leadpilot.integrations").warning("WhatsApp sidecar unreachable during disconnect — clearing DB state anyway")
            wa_account.status = "disconnected"
            wa_account.auth_state_encrypted = None
            wa_account.qr_code_data_url = None
            await db.commit()
        return {"ok": True}

    raw_id = integration_id.split("_", 1)[-1]
    integration = (
        await db.execute(select(Integration).where(Integration.id == raw_id, Integration.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if integration:
        integration.status = "disconnected"
        integration.credentials_encrypted = None
        await db.commit()
    return {"ok": True}
