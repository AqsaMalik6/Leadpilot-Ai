"""Post-meeting proposal flow: AI drafts a proposal from the lead's own qualification
data (budget/timeline/need/company size) plus the organization's real seeded pricing
tiers, a human manager reviews and approves it, then it's emailed for real. Deliberately
an email body, not a generated PDF attachment — claiming a PDF exists when none does
would be worse than not having one; the email itself carries scope/pricing/timeline in
full, which is what the client actually needs to read and decide on.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.client import groq_client, groq_configured
from app.config import get_settings
from app.models.cms import PricingTier
from app.models.lead import Conversation, Lead, Message
from app.models.organization import Organization

logger = logging.getLogger("leadpilot.proposal")
settings = get_settings()


def _suggest_tier_by_company_size(company_size: str | None, tiers: list[PricingTier]) -> PricingTier | None:
    if not tiers:
        return None
    highlighted = next((t for t in tiers if t.highlighted), None)
    return highlighted or tiers[0]


async def generate_proposal_draft(db: AsyncSession, lead: Lead) -> tuple[str, str]:
    """Returns (subject, body). Falls back to a plain templated draft if Groq isn't
    configured — a manager can still edit and send it, never a hard failure."""
    org = (await db.execute(select(Organization).where(Organization.id == lead.organization_id))).scalar_one()
    tiers = list((await db.execute(select(PricingTier).order_by(PricingTier.sort_order))).scalars().all())
    tier = _suggest_tier_by_company_size(lead.company_size, tiers)
    price_line = (
        f"{tier.name} plan — ${tier.monthly_price_cents / 100:.0f}/month"
        if tier and tier.monthly_price_cents
        else "a plan tailored to your team's volume"
    )

    # The qualification agent has no dedicated tool to persist budget/timeline/need/
    # company_size onto the lead record today (a separate, pre-existing gap — see
    # tools.py), so those structured fields are usually still null even on a genuinely
    # qualified lead. Reading the actual conversation transcript instead means the
    # proposal is grounded in what the lead really said, not blank placeholders.
    conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead.id))).scalar_one_or_none()
    transcript_text = "not available"
    if conversation:
        messages = (
            await db.execute(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at))
        ).scalars().all()
        transcript_text = "\n".join(f"{m.role}: {m.content}" for m in messages) or "not available"

    facts = (
        f"Contact: {lead.contact_name}\n"
        f"Need: {lead.need or 'see conversation transcript below'}\n"
        f"Timeline: {lead.timeline or 'see conversation transcript below'}\n"
        f"Team/lead volume: {lead.company_size or 'see conversation transcript below'}\n"
        f"Budget: {lead.budget or 'see conversation transcript below'}\n"
        f"Suggested plan: {price_line}\n\n"
        f"Conversation transcript:\n{transcript_text}"
    )

    if not groq_configured():
        subject = f"Proposal from {org.name}"
        body = (
            f"Dear {lead.contact_name},\n\nThank you for meeting with us.\n\n"
            f"Attached is our proposal for {org.name}'s AI lead automation.\n\n{facts}\n\n"
            f"Scope of work: respond to every inbound lead instantly, qualify automatically, "
            f"and hand off booked meetings to your team.\n\nLooking forward to working together.\n\n"
            f"— {org.name}"
        )
        return subject, body

    response = await groq_client.chat.completions.create(
        model=settings.groq_reasoning_model,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You write short, professional B2B sales proposal emails on behalf of {org.name}, "
                    "a company selling an AI sales-agent product. Write a complete proposal email body "
                    "(no subject line, just the body) addressed to the contact by name. Read the conversation "
                    "transcript to find their actual stated need, timeline, team/lead volume, and budget, and "
                    "reference those specifics — don't write generically if the transcript has real details. "
                    "Include: a thank-you for meeting, the scope of work (instant lead response, automatic "
                    "qualification, meeting booking), the suggested pricing plan, and an expected timeline. "
                    "Keep it under 200 words, warm but professional, no markdown formatting."
                ),
            },
            {"role": "user", "content": facts},
        ],
        max_tokens=400,
        temperature=0.4,
    )
    body = response.choices[0].message.content or ""
    subject = f"Your proposal from {org.name}"
    return subject, body
