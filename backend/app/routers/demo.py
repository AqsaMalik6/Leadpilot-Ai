"""POST /api/demo/lead — the highest-priority Phase-1 endpoint (SKILL-BACKEND.md
§2.3): turns the frontend's /demo LiveDemoWidget from a client-side scripted
simulation into a live call against the real Groq-powered agent.

Public sandbox leads attach to a dedicated seeded "demo" organization (slug
leadpilot-demo, created by scripts/seed.py) so is_demo=true leads never touch a real
customer's org, notifications, or CRM flow, while still running against a real
agent_configs row.

Honest scope note: this drives one real turn (see app/agent/pipeline.py docstring) —
the visitor's stated need gets a real, live-generated fast-ack + qualifying question
and a reasoning pass, not a fabricated multi-turn back-and-forth. There is no chat-box
UI yet for a true live back-and-forth.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.pipeline import process_new_lead
from app.core.rate_limit import check_rate_limit
from app.db import get_db
from app.models.lead import Conversation, Lead, Message
from app.models.organization import Organization
from app.schemas.auth import DemoLeadInput

router = APIRouter(prefix="/api/demo", tags=["demo"])

DEMO_ORG_SLUG = "leadpilot-demo"


@router.post("/lead", status_code=202)
async def demo_lead(payload: DemoLeadInput, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    check_rate_limit(f"demo:{request.client.host if request.client else 'unknown'}")

    demo_org = (await db.execute(select(Organization).where(Organization.slug == DEMO_ORG_SLUG))).scalar_one_or_none()
    if demo_org is None:
        raise HTTPException(status_code=503, detail="Demo sandbox not seeded yet — run scripts/seed.py")

    lead = Lead(
        organization_id=demo_org.id,
        source="demo_sandbox",
        contact_name=payload.name,
        status="new",
        is_demo=True,
        qualification_answers=[],
    )
    db.add(lead)
    await db.flush()
    conversation = Conversation(lead_id=lead.id, status="active")
    db.add(conversation)
    await db.flush()
    db.add(
        Message(
            conversation_id=conversation.id,
            role="lead",
            content=f"Hi, I'm {payload.name} from {payload.company}. {payload.need}",
            channel="website_form",
            message_metadata={},
        )
    )
    await db.commit()

    background_tasks.add_task(process_new_lead, lead.id)
    return {"accepted": True, "leadId": str(lead.id)}


@router.get("/lead/{lead_id}")
async def get_demo_lead(lead_id: str, db: AsyncSession = Depends(get_db)):
    """Polling endpoint the /demo page uses to fetch the generated transcript once
    the background pipeline has produced a reply — no session/org auth required
    since this only ever returns is_demo=true leads."""
    from app.routers.leads import _lead_to_schema

    lead = (await db.execute(select(Lead).where(Lead.id == lead_id, Lead.is_demo.is_(True)))).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    return {"lead": await _lead_to_schema(db, lead)}
