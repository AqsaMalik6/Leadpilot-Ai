"""Shared by every inbound channel (Gmail, WhatsApp) that needs to know exactly what
the agent said in one turn so it can send it back out for real. A single pipeline
call (process_new_lead/process_incoming_reply) can create more than one agent Message
(fast_ack + a reasoning turn) — sending them as separate messages reads as a glitchy
double-reply, so callers diff before/after and combine into one send.
"""

from sqlalchemy import select

from app.models.agent_action import AgentAction
from app.models.lead import Lead, Message


async def reopen_rejected_lead_if_needed(db, lead: Lead) -> None:
    """A rejected lead who messages back is a real re-engagement, not spam — reopen
    them instead of letting the caller's existing_lead lookup miss them and spin up a
    duplicate lead row. Temperature on reopen: warm if they ever actually had a real
    meeting (a genuine, further-along signal that outlasts a single rejection), cold if
    the entire relationship was just the original contact that got rejected — never
    silently left at whatever it was before."""
    if lead.status != "rejected":
        return
    lead.status = "new"
    had_a_real_meeting = lead.meeting_scheduled_at is not None or lead.booked_at is not None
    lead.temperature = "warm" if had_a_real_meeting else "cold"
    db.add(
        AgentAction(
            lead_id=lead.id,
            organization_id=lead.organization_id,
            action_type="classified_temperature",
            reasoning=(
                "Lead re-engaged after being rejected — "
                + ("marked warm (had a real meeting before)" if had_a_real_meeting else "marked cold (never had a meeting)")
            ),
        )
    )
    await db.commit()


async def agent_message_ids(db, conversation_id) -> set:
    return set(
        (await db.execute(select(Message.id).where(Message.conversation_id == conversation_id, Message.role == "agent"))).scalars().all()
    )


async def new_agent_messages(db, conversation_id, before_ids: set) -> list[Message]:
    all_msgs = (
        await db.execute(
            select(Message).where(Message.conversation_id == conversation_id, Message.role == "agent").order_by(Message.created_at)
        )
    ).scalars().all()
    return [m for m in all_msgs if m.id not in before_ids]


async def combined_new_reply_text(db, conversation_id, before_ids: set) -> str | None:
    """Convenience wrapper for the common case: fetch the new agent messages and join
    them into one string ready to send, or None if the turn produced nothing new."""
    new_msgs = await new_agent_messages(db, conversation_id, before_ids)
    if not new_msgs:
        return None
    return "\n\n".join(m.content for m in new_msgs)
