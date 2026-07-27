from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.encryption import encrypt_credentials
from app.db import get_db
from app.dependencies import get_current_user
from app.models.integration import Integration
from app.models.lead import LeadChannel
from app.models.user import User

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

_CHANNEL_LABELS = {
    "website_form": ("Website form", "Embed a snippet on your site to route form submissions straight to LeadPilot."),
    "whatsapp": ("WhatsApp Business", "Reply to inbound WhatsApp inquiries the moment they land."),
    "email": ("Email inbox", "Forward or connect a shared inbox for LeadPilot to monitor and reply from."),
}
_PROVIDER_LABELS = {
    "calendly": ("Calendly", "Let qualified leads book directly onto your team's calendar."),
    "slack": ("Slack", "Get a Slack alert the moment a lead is qualified or booked."),
    "hubspot": ("HubSpot CRM", "Sync qualified leads and transcripts directly into HubSpot."),
}


@router.get("")
async def list_integrations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Composes lead_channels (website_form/whatsapp/email) + integrations
    (calendly/slack/hubspot) into the one flat list the frontend's
    /dashboard/integrations page renders (SKILL-BACKEND.md §1 merged-view rule)."""
    channels = (
        await db.execute(select(LeadChannel).where(LeadChannel.organization_id == user.organization_id))
    ).scalars().all()
    integrations = (
        await db.execute(select(Integration).where(Integration.organization_id == user.organization_id))
    ).scalars().all()

    result = []
    for c in channels:
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
    # Providers with no row yet still show up as "not_connected" placeholders — no
    # extra code needed once slack/hubspot OAuth (Phase 2) actually lands.
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


@router.post("/slack/connect", status_code=501)
async def connect_slack():
    raise HTTPException(status_code=501, detail="Slack OAuth is Phase 2 — see SKILL-BACKEND.md §2.6")


@router.post("/hubspot/connect", status_code=501)
async def connect_hubspot():
    raise HTTPException(status_code=501, detail="HubSpot OAuth is Phase 2 — see SKILL-BACKEND.md §2.6")


@router.delete("/{integration_id}")
async def delete_integration(integration_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    raw_id = integration_id.split("_", 1)[-1]
    integration = (
        await db.execute(select(Integration).where(Integration.id == raw_id, Integration.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if integration:
        integration.status = "disconnected"
        integration.credentials_encrypted = None
        await db.commit()
    return {"ok": True}
