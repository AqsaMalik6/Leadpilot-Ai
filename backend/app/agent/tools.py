"""Function tools the qualification agent can call — send_calendly_link,
notify_sales_team, close_conversation (SKILL-BACKEND.md §3.2). Each takes the
RunContextWrapper[AgentRunContext] as its first argument per the Agents SDK
convention, so it can act directly on the DB mid-run."""

from datetime import datetime, timezone

from agents import RunContextWrapper, function_tool
from sqlalchemy import select

from app.agent.context import AgentRunContext
from app.config import get_settings
from app.models.agent_action import AgentAction
from app.models.agent_config import AgentConfig
from app.models.lead import Conversation, Lead
from app.models.notification import Notification
from app.services.notification_service import send_lead_notification_email


def _log_action(ctx: AgentRunContext, action_type: str, reasoning: str) -> None:
    """SKILL-DIGITAL-FTE-UPGRADE.md §1/§7 — the AI reasoning/timeline log the dashboard's
    lead-detail view reads from (GET /api/leads/{id}/actions)."""
    ctx.db.add(AgentAction(lead_id=ctx.lead_id, organization_id=ctx.organization_id, action_type=action_type, reasoning=reasoning))


@function_tool
async def send_calendly_link(wrapper: RunContextWrapper[AgentRunContext], reason: str) -> str:
    """Send the lead a Calendly booking link because they're qualified and ready to
    talk to a human. Call this once budget/timeline/need are confirmed.

    Args:
        reason: One short sentence on why this lead qualifies for a call.
    """
    ctx = wrapper.context
    link = ctx.calendly_url or get_settings().default_calendly_url or "https://calendly.com/leadpilot-demo"

    result = await ctx.db.execute(select(Lead).where(Lead.id == ctx.lead_id))
    lead = result.scalar_one()
    lead.status = "qualified"
    # SKILL-DIGITAL-FTE-UPGRADE.md §6 sync rule: pipeline_stage=qualified keeps status
    # in sync here. pipeline_stage only advances to meeting_scheduled once the Calendly
    # webhook (§5) confirms the lead actually booked — sending the link isn't a booking.
    lead.pipeline_stage = "qualified"
    lead.calendly_booking_url = link
    lead.qualification_score = lead.qualification_score or 80

    conv_result = await ctx.db.execute(select(Conversation).where(Conversation.id == ctx.conversation_id))
    conversation = conv_result.scalar_one()
    conversation.status = "completed"
    _log_action(ctx, "updated_pipeline_stage", f"Qualified and sent Calendly link — {reason}")
    await ctx.db.commit()

    return f"Sent Calendly link ({link}) — {reason}"


@function_tool
async def notify_sales_team(wrapper: RunContextWrapper[AgentRunContext], summary: str) -> str:
    """Alert the sales team that a lead was qualified (or booked) and needs
    attention.

    Args:
        summary: A 1-2 sentence summary of the lead and why they matter.
    """
    ctx = wrapper.context
    config = (await ctx.db.execute(select(AgentConfig).where(AgentConfig.organization_id == ctx.organization_id))).scalar_one()
    email_enabled = (config.notification_rules or {}).get("email", {}).get("qualified", True)
    if not email_enabled:
        return "Sales team notification skipped — disabled in this org's notification rules"

    notification = Notification(
        organization_id=ctx.organization_id,
        lead_id=ctx.lead_id,
        type="lead_qualified",
        channel="email",
        status="pending",
        payload={"summary": summary},
    )
    ctx.db.add(notification)
    await ctx.db.flush()
    sent = await send_lead_notification_email(ctx.organization_id, ctx.lead_id, summary)
    notification.status = "sent" if sent else "failed"
    notification.sent_at = datetime.now(timezone.utc) if sent else None
    _log_action(ctx, "notified_owner", summary)
    await ctx.db.commit()
    return "Sales team notified"


@function_tool
async def close_conversation(wrapper: RunContextWrapper[AgentRunContext], reason: str) -> str:
    """Politely end the conversation because the lead isn't a fit right now (out of
    budget range, wrong company size, not the decision-maker with no path to them,
    or abusive/off-topic). Never call this just because the lead asked a hard
    question — only when they're genuinely not qualified.

    Args:
        reason: A short, factual reason — this is stored and shown to the sales team.
    """
    ctx = wrapper.context
    result = await ctx.db.execute(select(Lead).where(Lead.id == ctx.lead_id))
    lead = result.scalar_one()
    lead.status = "rejected"
    lead.pipeline_stage = "lost"  # §6 sync rule
    lead.rejection_reason = reason

    conv_result = await ctx.db.execute(select(Conversation).where(Conversation.id == ctx.conversation_id))
    conversation = conv_result.scalar_one()
    conversation.status = "completed"
    _log_action(ctx, "updated_pipeline_stage", f"Closed as not a fit — {reason}")
    await ctx.db.commit()

    return f"Conversation closed: {reason}"
