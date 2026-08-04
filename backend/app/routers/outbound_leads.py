"""SKILL-OUTBOUND.md — free outbound lead prospecting.

Routing: IT/tech categories go to GitHub (real signal for software houses/AI
companies); everything else goes to OSM Overpass (free forever, primary), falling
back to Geoapify only when OSM returns too few results for the area (keeps Geoapify's
daily free quota usage low). Both optional sources (Geoapify/GitHub) no-op cleanly
when their free API key isn't configured yet — never a hard failure.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.client import groq_client, groq_configured
from app.config import get_settings
from app.db import get_db
from app.dependencies import get_current_user
from app.models.agent_action import AgentAction
from app.models.lead import Conversation, Lead, Message
from app.models.organization import Organization
from app.models.outbound_lead import OutboundLead
from app.models.user import User
from app.schemas.outbound_lead import AddToCampaignRequest, SearchRequest
from app.services.email_service import send_email
from app.services.whatsapp_service import send_whatsapp_message_for_org
from app.tools.common import is_tech_category
from app.tools.geoapify import find_places_geoapify
from app.tools.github_leads import find_tech_leads
from app.tools.osm import find_local_businesses

logger = logging.getLogger("leadpilot.outbound_leads")
settings = get_settings()
router = APIRouter(prefix="/api/integrations/outbound-leads", tags=["outbound-leads"])

# Below this many OSM results, also try the Geoapify fallback for the same search —
# SKILL-OUTBOUND.md §1/§4.
_MIN_RESULTS_BEFORE_FALLBACK = 5


async def _generate_outreach_message(org: Organization, outbound_lead: OutboundLead) -> tuple[str, str]:
    """Returns (subject, body) for the FIRST message to a business we found ourselves
    (not replying to anything — cold outreach). Falls back to a plain template if
    Groq isn't configured, same convention as proposal_service.py."""
    if not groq_configured():
        subject = f"Quick question for {outbound_lead.business_name}"
        body = (
            f"Hi {outbound_lead.business_name} team,\n\n"
            f"I came across your {outbound_lead.category or 'business'}"
            f"{f' in {outbound_lead.location}' if outbound_lead.location else ''} — we help businesses like "
            f"yours respond to leads instantly with an AI sales agent. Would you be open to a quick chat about "
            f"whether this could help you?\n\nBest,\n{org.name}"
        )
        return subject, body

    response = await groq_client.chat.completions.create(
        model=settings.groq_reasoning_model,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You write short, professional cold-outreach messages on behalf of {org.name}, a company "
                    "selling an AI sales-agent product that responds to leads instantly and qualifies them "
                    "automatically. You are reaching out FIRST to a business that has never contacted you — "
                    "mention their business name and what they actually do, specifically (don't write "
                    "generically), and pitch that you can provide an AI solution to help their business respond "
                    "to and qualify leads faster. End with a soft, low-pressure question inviting a reply. Keep "
                    "it under 80 words, warm but professional, no markdown formatting, no subject line — just "
                    "the message body, since this goes out over email or WhatsApp depending on the contact."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Business name: {outbound_lead.business_name}\n"
                    f"Category/industry: {outbound_lead.category}\n"
                    f"Location: {outbound_lead.location or 'unknown'}"
                ),
            },
        ],
        max_tokens=200,
        temperature=0.5,
    )
    body = response.choices[0].message.content or ""
    subject = f"Quick question for {outbound_lead.business_name}"
    return subject, body


@router.post("/search")
async def search_outbound_leads(req: SearchRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org_id = str(user.organization_id)
    limit = req.max_results
    try:
        if is_tech_category(req.category):
            results = await find_tech_leads("startups_by_topic", {"topic": req.category}, org_id, db, limit=limit, location=req.location)
            if not results:
                # A topic search can easily miss real companies that just don't tag
                # their repos that way — org_lookup on the category text itself
                # catches e.g. a literal company name typed into the search box.
                results = await find_tech_leads("org_lookup", {"name": req.category}, org_id, db, limit=limit, location=req.location)
        else:
            try:
                results = await find_local_businesses(req.category, req.location, org_id, db, limit=limit)
            except ValueError:
                raise  # bad location (geocoding failed) — a real 400, not an upstream flake
            except Exception:
                # OSM's free Overpass instance genuinely goes down/overloaded sometimes
                # (confirmed live: repeated 504s) — that shouldn't kill the whole search
                # when Geoapify is a second, independent free source that can still work.
                logger.warning("OSM search failed (category=%r, location=%r) — falling back to Geoapify", req.category, req.location, exc_info=True)
                results = []
            if len(results) < min(_MIN_RESULTS_BEFORE_FALLBACK, limit):
                geoapify_results = await find_places_geoapify(req.category, req.location, org_id, db, limit=limit - len(results))
                results = results + geoapify_results
        # Each source already respects `limit` internally, but a fallback concatenation
        # (OSM + Geoapify) can still land a little over — the user picked an exact
        # ceiling, so enforce it here too rather than trusting every source's own count.
        results = results[:limit]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Outbound lead search failed (category=%r, location=%r)", req.category, req.location)
        raise HTTPException(status_code=502, detail="Search failed — the upstream source may be temporarily unavailable")

    return {"leads": [_to_schema(lead) for lead in results]}


@router.get("")
async def list_outbound_leads(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(OutboundLead).where(OutboundLead.organization_id == user.organization_id).order_by(OutboundLead.found_at.desc())
        )
    ).scalars().all()
    return {"leads": [_to_schema(r) for r in rows]}


def _to_schema(lead: OutboundLead) -> dict:
    return {
        "id": lead.id,
        "businessName": lead.business_name,
        "category": lead.category,
        "address": lead.address,
        "phone": lead.phone,
        "website": lead.website,
        "email": lead.email,
        "location": lead.location,
        "techStack": lead.tech_stack,
        "githubOrgOrUser": lead.github_org_or_user,
        "lat": lead.lat,
        "lng": lead.lng,
        "source": lead.source,
        "status": lead.status,
        "foundAt": lead.found_at.isoformat() if lead.found_at else None,
    }


@router.delete("/{lead_id}")
async def delete_outbound_lead(lead_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lead = (
        await db.execute(select(OutboundLead).where(OutboundLead.id == lead_id, OutboundLead.organization_id == user.organization_id))
    ).scalar_one_or_none()
    if lead is None:
        raise HTTPException(status_code=404, detail="Not found")
    await db.execute(OutboundLead.__table__.delete().where(OutboundLead.id == lead.id))
    await db.commit()
    return {"ok": True}


@router.post("/add-to-campaign")
async def add_to_campaign(req: AddToCampaignRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    outbound_leads = (
        await db.execute(
            select(OutboundLead).where(OutboundLead.id.in_(req.lead_ids), OutboundLead.organization_id == user.organization_id)
        )
    ).scalars().all()
    if not outbound_leads:
        raise HTTPException(status_code=404, detail="No outbound leads found for this organization")

    org = (await db.execute(select(Organization).where(Organization.id == user.organization_id))).scalar_one()

    added = 0
    for o in outbound_leads:
        if o.status == "added_to_campaign":
            continue  # already promoted once — don't create a second duplicate Lead
        lead = Lead(
            organization_id=user.organization_id,
            source="outbound",
            contact_name=o.business_name,
            contact_email=o.email,
            contact_phone=o.phone,
            status="new",
        )
        db.add(lead)
        await db.flush()
        o.status = "added_to_campaign"
        o.promoted_lead_id = lead.id
        added += 1

        conversation = Conversation(lead_id=lead.id, status="active")
        db.add(conversation)
        await db.flush()

        # A promoted outbound lead never messaged us first — send a real cold-outreach
        # message referencing their business, same qualify-etc. pipeline picks up
        # whatever they reply with next since it's a normal Lead/Conversation from
        # here on. No usable contact info at all (common for GitHub-sourced leads
        # with a hidden email) is a genuine limit, not a bug — the lead still shows up
        # in the pipeline for manual outreach, just with no AI-sent message logged.
        if o.email or o.phone:
            try:
                subject, body = await _generate_outreach_message(org, o)
                if o.email:
                    channel = "email"
                    sent = await send_email(o.email, subject, body)
                else:
                    channel = "whatsapp"
                    sent = await send_whatsapp_message_for_org(user.organization_id, o.phone, body)
                db.add(
                    Message(
                        conversation_id=conversation.id,
                        role="agent",
                        content=body,
                        channel=channel,
                        message_metadata={"stage": "outbound_outreach"},
                    )
                )
                lead.last_outbound_at = datetime.now(timezone.utc)
                lead.pipeline_stage = "contacted"
                db.add(
                    AgentAction(
                        lead_id=lead.id,
                        organization_id=user.organization_id,
                        action_type="outbound_outreach",
                        reasoning=f"Reached out to {o.business_name} ({o.category}) via {channel}"
                        + ("" if sent else " (delivery failed, see server logs — fell back to console log)"),
                    )
                )
            except Exception:
                logger.exception("Outbound outreach failed for outbound_lead_id=%s — lead still added, just no message sent", o.id)
    await db.commit()
    return {"added": added}
