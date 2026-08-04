import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.pipeline import process_new_lead
from app.core.cookies import issue_session_cookie
from app.core.encryption import encrypt_credentials
from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_config import AgentConfig
from app.models.integration import Integration
from app.models.lead import Conversation, Lead, LeadChannel, Message
from app.models.user import User
from app.routers.auth import _to_session_user
from app.schemas.auth import DemoLeadInput
from app.schemas.common import CamelModel

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])


class StepInput(CamelModel):
    step: int


class ChannelInput(CamelModel):
    channel_type: str = "website_form"
    config: dict = {}


class AgentSetupInput(CamelModel):
    persona: str | None = None
    calendly_url: str | None = None


@router.get("/status")
async def get_status(user: User = Depends(get_current_user)):
    return {"step": user.onboarding_step}


@router.post("/status")
async def set_status(payload: StepInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.onboarding_step = max(1, min(4, payload.step))
    await db.commit()
    return {"ok": True}


@router.post("/complete")
async def complete(response: Response, request: Request, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user.onboarding_completed_at = datetime.now(timezone.utc)
    await db.flush()
    await issue_session_cookie(response, db, user.id, request.client.host if request.client else None, request.headers.get("user-agent"))
    await db.commit()
    return {"ok": True, "user": _to_session_user(user)}


@router.post("/channel")
async def set_channel(payload: ChannelInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    existing = (
        await db.execute(
            select(LeadChannel).where(
                LeadChannel.organization_id == user.organization_id,
                LeadChannel.channel_type == payload.channel_type,
            )
        )
    ).scalar_one_or_none()
    if existing:
        existing.config = {**existing.config, **payload.config}
        existing.is_active = True
    else:
        db.add(
            LeadChannel(
                organization_id=user.organization_id,
                channel_type=payload.channel_type,
                config={"form_key": str(user.organization_id), **payload.config},
                is_active=True,
            )
        )
    await db.commit()
    return {"ok": True}


@router.post("/agent")
async def set_agent(payload: AgentSetupInput, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == user.organization_id))).scalar_one()
    if payload.persona:
        config.persona = payload.persona
    if payload.calendly_url:
        config.calendly_link = payload.calendly_url
        # Mirrors app/routers/integrations.py's connect_calendly — this is the second
        # of two places a Calendly link can be saved from (onboarding Step 3 vs the
        # dashboard Integrations page), and the dashboard's "Connected" status reads
        # only from the Integration row. Without this, saving from onboarding left
        # AgentConfig.calendly_link set (the agent's send_calendly_link tool worked)
        # but the Integrations page still showed Calendly as "Not connected".
        integration = (
            await db.execute(
                select(Integration).where(Integration.organization_id == user.organization_id, Integration.provider == "calendly")
            )
        ).scalar_one_or_none()
        if integration is None:
            integration = Integration(organization_id=user.organization_id, provider="calendly")
            db.add(integration)
        integration.credentials_encrypted = encrypt_credentials(payload.calendly_url)
        integration.status = "connected"
        integration.connected_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


@router.post("/test-lead")
async def test_lead(
    payload: DemoLeadInput,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fires a synthetic lead through the live Groq pipeline so a new org can see the
    agent work before connecting a real channel (SKILL-BACKEND.md §2.2)."""
    lead = Lead(
        organization_id=user.organization_id,
        source="website_form",
        contact_name=payload.name,
        contact_email=None,
        contact_phone=None,
        status="new",
        is_demo=True,
        qualification_answers=[],
    )
    db.add(lead)
    await db.flush()
    conversation = Conversation(lead_id=lead.id, status="active")
    db.add(conversation)
    await db.flush()
    db.add(Message(conversation_id=conversation.id, role="lead", content=f"{payload.company}: {payload.need}", channel="website_form", message_metadata={}))
    await db.commit()

    background_tasks.add_task(process_new_lead, lead.id)
    return {"ok": True, "leadId": str(lead.id)}
