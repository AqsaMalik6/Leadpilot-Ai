"""Two-stage reply pipeline (SKILL-BACKEND.md §3.2) — fast-ack then a reasoning pass,
both on Groq via the OpenAI Agents SDK.

Honest scope note: this drives one real turn (the lead's initial message -> a real,
live-generated fast-ack + qualifying question, then a reasoning pass that qualifies /
rejects / asks for more with whatever is known so far). `process_incoming_reply` exists
so a genuine multi-turn conversation (a real WhatsApp thread, or a future chat-box
demo UI) keeps working turn-by-turn — but today's /demo page is a one-shot form, not a
live chat box, so it only ever exercises the first turn. See the delivery notes for
why a full multi-turn *simulated* exchange was deliberately not fabricated here.
"""

import asyncio
import logging
import re
import sys
import uuid
from datetime import datetime, timezone

from agents import Agent, OpenAIChatCompletionsModel, Runner
from agents.mcp import MCPServerStdio
from sqlalchemy import select

logger = logging.getLogger("leadpilot.agent.pipeline")

from app.agent.client import groq_client, groq_configured
from app.agent.context import AgentRunContext
from app.agent.guardrails import block_hallucinated_claims, reject_prompt_injection
from app.agent.tools import close_conversation, notify_sales_team, send_calendly_link
from app.config import get_settings
from app.db import SessionLocal
from app.models.agent_action import AgentAction
from app.models.agent_config import AgentConfig
from app.models.lead import Conversation, Lead, Message
from app.realtime import publish_event

settings = get_settings()

# Real MCP connector for WhatsApp/email send (app/mcp/messaging_server.py) — a
# genuine stdio MCP server the qualification agent connects to as an SDK-native
# MCP client, not just an in-process function_tool. Connected lazily, once, and
# reused across turns since spawning a subprocess per-reply would be wasteful;
# if it fails to connect for any reason the pipeline still runs without it
# rather than taking the whole lead down.
_messaging_mcp_server: MCPServerStdio | None = None
_messaging_mcp_lock = asyncio.Lock()


async def _get_messaging_mcp_server() -> MCPServerStdio | None:
    global _messaging_mcp_server
    async with _messaging_mcp_lock:
        if _messaging_mcp_server is not None:
            return _messaging_mcp_server
        try:
            server = MCPServerStdio(
                name="leadpilot-messaging",
                params={"command": sys.executable, "args": ["-m", "app.mcp.messaging_server"]},
                client_session_timeout_seconds=10,
            )
            await server.connect()
            _messaging_mcp_server = server
            logger.info("Connected to leadpilot-messaging MCP server")
        except Exception:
            logger.exception("Failed to connect to leadpilot-messaging MCP server — continuing without it")
            return None
        return _messaging_mcp_server

_ROLE_TO_AGENT_INPUT = {"lead": "user", "agent": "assistant", "system": "system"}

# Groq's open-weight models occasionally echo a tool call as literal text (e.g.
# "<function(close_conversation){...}</function>") instead of — or in addition to —
# issuing it as a real structured tool_call. When that happens the tool usually still
# executes for real (see the agent_actions row it logs), but this leftover text must
# never reach the customer as a message; it reads as broken code, not a reply.
_MALFORMED_TOOL_CALL_RE = re.compile(r"<function[=(]|</function>")


def build_system_prompt(config: AgentConfig) -> str:
    questions = "\n".join(f"- ({q['field']}) {q['prompt']}" for q in config.qualifying_questions)
    guardrails = "\n".join(f"- {g}" for g in config.guardrails)
    override = f"\n\nAdditional instructions:\n{config.system_prompt_override}" if config.system_prompt_override else ""
    return (
        f"You are {config.persona}\n\n"
        f"Your job is to qualify this inbound lead by naturally working through these "
        f"questions over the conversation (don't interrogate — ask one at a time):\n{questions}\n\n"
        f"Rules you must always follow:\n{guardrails}\n\n"
        f"Once you have enough signal (roughly a score of {config.handoff_threshold_score}/100 or "
        f"higher — weigh budget fit, timeline urgency, and decision authority), call "
        f"send_calendly_link and notify_sales_team. If the lead is clearly not a fit "
        f"(no budget, wrong company size, abusive, or off-topic), call close_conversation "
        f"with a short factual reason. Otherwise keep asking qualifying questions.\n\n"
        f"Your final reply is sent directly to the lead as an email/message — always write "
        f"it as a warm, direct message TO them, never as a third-person status report of your "
        f"own actions (never say things like 'I've notified the sales team' or 'I've sent a "
        f"Calendly link' — the lead does not care what you did internally, they need an "
        f"actual message). If you just called send_calendly_link, your reply must include the "
        f"literal booking link so they can click it."
        f"{override}"
    )


async def fast_ack(config: AgentConfig, need_text: str) -> str:
    if not groq_configured():
        return (
            f"Thanks for reaching out — I'm {config.persona.split(',')[0] if config.persona else 'the LeadPilot AI assistant'}. "
            "GROQ_API_KEY isn't configured yet, so this is a placeholder reply — set it in .env to go live."
        )
    response = await groq_client.chat.completions.create(
        model=settings.groq_fast_model,
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are {config.persona}\nAcknowledge this lead in ONE short, warm sentence "
                    "and ask exactly one qualifying question. Never claim to be human."
                ),
            },
            {"role": "user", "content": need_text},
        ],
        max_tokens=120,
        temperature=0.6,
    )
    return response.choices[0].message.content or "Thanks for reaching out — someone will follow up shortly."


async def classify_is_lead(email_text: str) -> bool:
    """SKILL-DIGITAL-FTE-UPGRADE.md §2 — one cheap Groq call on the same fast-model
    tier as fast_ack, used by gmail_poll_job to skip newsletters/spam before they ever
    become a CRM entry. Not a new model integration — same cost/latency class as the
    existing fast-ack call. Fails safe (returns False) if Groq isn't configured.

    Deliberately biased toward "yes": missing a real lead (false negative) silently
    drops a real customer inquiry with zero visibility, while misclassifying a
    newsletter as a lead (false positive) just creates one harmless extra CRM row a
    human can dismiss in a click. The two failure modes are not equally costly, so the
    prompt is written — with few-shot examples — to only say "no" for unambiguous
    automated mail (unsubscribe footers, receipts, verification codes), not merely
    because a message is short or doesn't explicitly say "I want to buy something"."""
    if not groq_configured():
        return False
    response = await groq_client.chat.completions.create(
        model=settings.groq_fast_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You triage inbound email for a B2B SaaS company that sells an AI sales-agent "
                    "product. Decide if this email is a real message from a human describing a "
                    "business problem, asking about the product, or continuing a sales conversation — "
                    "as opposed to unambiguous automated mail: a newsletter, an unsubscribe-footer "
                    "marketing blast, a receipt/invoice, a password-reset or verification code, or a "
                    "delivery/shipping notification.\n\n"
                    "When in doubt, answer yes — a short or informally-written message from a real "
                    "person is still a real lead, even if it doesn't explicitly say \"I want to buy\".\n\n"
                    "Examples:\n"
                    '"We\'re a real estate team of 15 agents getting 200 leads/month and can\'t keep up" -> yes\n'
                    '"I want to know about your team work" -> yes\n'
                    '"Tell me more about your product" -> yes\n'
                    '"50% off all products this week only! Unsubscribe here." -> no\n'
                    '"Your invoice #4471 is attached." -> no\n'
                    '"Your verification code is 583921." -> no\n\n'
                    'Reply with exactly one word: "yes" or "no".'
                ),
            },
            {"role": "user", "content": email_text[:2000]},
        ],
        max_tokens=5,
        temperature=0,
    )
    answer = (response.choices[0].message.content or "").strip().lower()
    is_lead = answer.startswith("yes")
    logger.info("classify_is_lead -> %s (raw model answer=%r) for text=%r", is_lead, answer, email_text[:200])
    return is_lead


async def _qualification_agent(config: AgentConfig) -> Agent[AgentRunContext]:
    mcp_server = await _get_messaging_mcp_server()
    return Agent[AgentRunContext](
        name="qualifier",
        instructions=build_system_prompt(config)
        + (
            "\n\nYou also have send_whatsapp and send_email_message tools (via MCP) if you need to "
            "reach the lead on a channel other than this conversation — only use them if explicitly relevant."
            if mcp_server
            else ""
        ),
        model=OpenAIChatCompletionsModel(model=settings.groq_reasoning_model, openai_client=groq_client),
        tools=[send_calendly_link, notify_sales_team, close_conversation],
        mcp_servers=[mcp_server] if mcp_server else [],
        input_guardrails=[reject_prompt_injection],
        output_guardrails=[block_hallucinated_claims],
    )


async def _history_as_input(db, conversation_id: uuid.UUID) -> list[dict]:
    result = await db.execute(select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at))
    return [{"role": _ROLE_TO_AGENT_INPUT.get(m.role, "user"), "content": m.content} for m in result.scalars().all()]


_MEMORY_SUMMARY_TRIGGER_MESSAGES = 12


async def _history_with_memory(db, conversation: Conversation) -> list[dict]:
    """SKILL-DIGITAL-FTE-UPGRADE.md §2 — once a conversation's history exceeds
    _MEMORY_SUMMARY_TRIGGER_MESSAGES, summarize the oldest portion into
    conversation.memory_summary via one small Groq call and replay
    [memory_summary] + the last _MEMORY_SUMMARY_TRIGGER_MESSAGES messages instead of
    the full transcript — bounds cost/context size as a long-running thread (a Gmail
    thread especially) grows. No-ops (falls back to full history) if Groq isn't configured."""
    full_history = await _history_as_input(db, conversation.id)
    if len(full_history) <= _MEMORY_SUMMARY_TRIGGER_MESSAGES or not groq_configured():
        return full_history

    to_summarize = full_history[: -_MEMORY_SUMMARY_TRIGGER_MESSAGES]
    recent = full_history[-_MEMORY_SUMMARY_TRIGGER_MESSAGES:]
    transcript_text = "\n".join(f"{m['role']}: {m['content']}" for m in to_summarize)
    prior = f"Prior summary: {conversation.memory_summary}\n\n" if conversation.memory_summary else ""
    response = await groq_client.chat.completions.create(
        model=settings.groq_fast_model,
        messages=[
            {
                "role": "system",
                "content": "Summarize this lead conversation history in 2-3 sentences — facts and stated needs only, no commentary.",
            },
            {"role": "user", "content": f"{prior}{transcript_text}"},
        ],
        max_tokens=150,
        temperature=0.2,
    )
    conversation.memory_summary = response.choices[0].message.content or conversation.memory_summary
    await db.commit()
    return [{"role": "system", "content": f"[Earlier conversation summary] {conversation.memory_summary}"}] + recent


async def _fallback_customer_message(db, lead_id: uuid.UUID) -> str | None:
    """A tool (send_calendly_link / close_conversation) can commit its real DB side
    effect and then have the model's follow-up natural-language reply get suppressed
    (Groq's malformed-tool-call-as-text quirk, or an outright failure) — leaving the
    lead genuinely qualified/rejected in the database with nobody ever telling the
    customer. Rather than send nothing, produce one deterministic, honest message from
    the lead's actual current state so the real outcome always reaches them."""
    lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one()
    if lead.status == "qualified" and lead.calendly_booking_url:
        return (
            "Thanks for sharing those details — based on what you've told us, this looks like a "
            f"great fit. You can grab a time on our calendar here: {lead.calendly_booking_url}"
        )
    if lead.status == "rejected" and lead.rejection_reason:
        return f"Thanks for the details — {lead.rejection_reason}. Feel free to reach back out anytime if that changes."
    return None


async def _run_reasoning_turn(
    db, org_id: uuid.UUID, lead_id: uuid.UUID, conversation_id: uuid.UUID, config: AgentConfig, history: list[dict]
) -> str | None:
    if not groq_configured():
        return None
    ctx = AgentRunContext(
        db=db,
        organization_id=org_id,
        lead_id=lead_id,
        conversation_id=conversation_id,
        calendly_url=config.calendly_link,
    )
    logger.info("Starting reasoning turn for lead_id=%s (%d history messages)", lead_id, len(history))

    # Groq's open-weight models occasionally emit malformed function-call syntax under
    # multi-tool sequences (observed as openai.BadRequestError: tool_use_failed) — a
    # real model-reliability characteristic, not something fixable in this code. One
    # retry clears most of these since it's non-deterministic generation, not a
    # structural failure. IMPORTANT: tools commit their DB side effects immediately, so
    # if attempt 1 already resolved the lead (qualified/rejected) before failing on a
    # later step, do NOT retry the whole run — a second attempt could reach a different
    # conclusion and call a second, contradictory tool (e.g. close_conversation after
    # send_calendly_link already ran), leaving inconsistent state.
    last_exc: Exception | None = None
    for attempt in range(2):
        try:
            agent = await _qualification_agent(config)
            result = await asyncio.wait_for(
                Runner.run(agent, history, context=ctx, max_turns=6),
                timeout=45,
            )
            logger.info(
                "Reasoning turn finished for lead_id=%s (attempt %d), final_output=%r, new_items=%d",
                lead_id, attempt + 1, result.final_output, len(result.new_items),
            )
            final_text = result.final_output if isinstance(result.final_output, str) else str(result.final_output)
            if _MALFORMED_TOOL_CALL_RE.search(final_text):
                logger.warning(
                    "lead_id=%s reasoning turn leaked raw tool-call syntax as text — suppressing it "
                    "from the customer-facing message (any real tool call already ran and committed): %r",
                    lead_id, final_text,
                )
                return await _fallback_customer_message(db, lead_id)
            return final_text
        except asyncio.TimeoutError:
            logger.error("Reasoning turn TIMED OUT after 45s for lead_id=%s (attempt %d)", lead_id, attempt + 1)
            last_exc = None
            break
        except Exception as exc:  # guardrail tripwires, model/tooling errors
            logger.warning("Reasoning turn attempt %d failed for lead_id=%s: %s", attempt + 1, lead_id, exc)
            last_exc = exc
            already_resolved = (await db.execute(select(Lead.status).where(Lead.id == lead_id))).scalar_one()
            if already_resolved != "new":
                logger.info("lead_id=%s already resolved to %r by a tool call before the failure — not retrying", lead_id, already_resolved)
                return await _fallback_customer_message(db, lead_id)

    if last_exc is not None:
        logger.exception("Reasoning turn failed for lead_id=%s after retry", lead_id, exc_info=last_exc)
        return "[agent pipeline error, human review needed — see server logs]"
    return "[agent pipeline timed out, human review needed — see server logs]"


def _ensure_calendly_link_in_reply(lead: Lead, reasoning_text: str, previous_calendly_url: str | None) -> str:
    """Groq's free model sometimes writes its final reply as a third-person status
    report ("I've notified the sales team and sent a Calendly link...") instead of an
    actual customer-facing message containing the link — the lead is then left with
    nothing to click. If send_calendly_link fired this turn (calendly_booking_url just
    went from unset to set) and the reply text doesn't literally contain that URL,
    append it — a deterministic guarantee that doesn't depend on the model's phrasing."""
    if lead.calendly_booking_url and lead.calendly_booking_url != previous_calendly_url and lead.calendly_booking_url not in reasoning_text:
        return f"{reasoning_text}\n\nYou can book a time here: {lead.calendly_booking_url}"
    return reasoning_text


async def process_new_lead(lead_id: uuid.UUID) -> None:
    try:
        async with SessionLocal() as db:
            lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one()
            conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead_id))).scalar_one()
            config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == lead.organization_id))).scalar_one()

            first_message = (
                await db.execute(select(Message).where(Message.conversation_id == conversation.id).order_by(Message.created_at))
            ).scalars().first()
            need_text = first_message.content if first_message else "No details provided yet."
            # Captured BEFORE the fast-ack message is added — the reasoning stage reacts
            # to the lead's actual input, not to the fast-ack's own reply (which has no
            # new information in it and would otherwise leave the model with nothing
            # fresh to respond to, producing an empty final_output).
            initial_history = [{"role": "user", "content": need_text}]

            ack_text = await fast_ack(config, need_text)
            now = datetime.now(timezone.utc)
            db.add(Message(conversation_id=conversation.id, role="agent", content=ack_text, channel=lead.source if lead.source != "demo_sandbox" else "website_form", message_metadata={"model": "groq" if groq_configured() else "unconfigured", "stage": "fast_ack"}))
            lead.responded_at = now
            lead.response_time_seconds = max(1, int((now - lead.created_at.replace(tzinfo=timezone.utc)).total_seconds()))
            # SKILL-DIGITAL-FTE-UPGRADE.md §3/§6: last_inbound_at/last_outbound_at feed
            # the follow_up_sweep job; new -> contacted on the first AI reply sent.
            lead.last_inbound_at = lead.created_at
            lead.last_outbound_at = now
            if lead.pipeline_stage == "new":
                lead.pipeline_stage = "contacted"
                db.add(AgentAction(lead_id=lead.id, organization_id=lead.organization_id, action_type="replied", reasoning="Sent instant acknowledgment and first qualifying question"))
            await db.commit()

            await publish_event(lead.organization_id, {"type": "new_lead", "lead": _lead_list_item(lead)})

            previous_calendly_url = lead.calendly_booking_url
            reasoning_text = await _run_reasoning_turn(db, lead.organization_id, lead.id, conversation.id, config, initial_history)
            if reasoning_text:
                reasoning_text = _ensure_calendly_link_in_reply(lead, reasoning_text, previous_calendly_url)
                db.add(
                    Message(
                        conversation_id=conversation.id,
                        role="agent",
                        content=reasoning_text,
                        channel=lead.source if lead.source != "demo_sandbox" else "website_form",
                        message_metadata={"model": "groq", "stage": "reasoning"},
                    )
                )
                lead.last_outbound_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(lead)
                await publish_event(lead.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": lead.status})
    except Exception:
        logger.exception("process_new_lead crashed for lead_id=%s", lead_id)


async def process_incoming_reply(lead_id: uuid.UUID, text: str) -> None:
    """Entry point for a genuine follow-up turn on an existing conversation — a real
    WhatsApp/email reply, or a future chat-box demo UI. Not exercised by today's
    one-shot /demo form (see module docstring)."""
    try:
        async with SessionLocal() as db:
            lead = (await db.execute(select(Lead).where(Lead.id == lead_id))).scalar_one()
            conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == lead_id))).scalar_one()
            config = (await db.execute(select(AgentConfig).where(AgentConfig.organization_id == lead.organization_id))).scalar_one()

            db.add(Message(conversation_id=conversation.id, role="lead", content=text, channel=lead.source if lead.source != "demo_sandbox" else "website_form", message_metadata={}))
            lead.last_inbound_at = datetime.now(timezone.utc)
            # A genuine reply resets any pending follow-up sequence — the lead is
            # engaged again, so the follow_up_sweep job (§3) shouldn't chase them further
            # on the old timer.
            lead.follow_up_count = 0
            await db.commit()

            history = await _history_with_memory(db, conversation)
            previous_calendly_url = lead.calendly_booking_url
            reasoning_text = await _run_reasoning_turn(db, lead.organization_id, lead.id, conversation.id, config, history)
            if reasoning_text:
                reasoning_text = _ensure_calendly_link_in_reply(lead, reasoning_text, previous_calendly_url)
                db.add(
                    Message(
                        conversation_id=conversation.id,
                        role="agent",
                        content=reasoning_text,
                        channel=lead.source if lead.source != "demo_sandbox" else "website_form",
                        message_metadata={"model": "groq", "stage": "reasoning"},
                    )
                )
                lead.last_outbound_at = datetime.now(timezone.utc)
                await db.commit()
                await db.refresh(lead)
                await publish_event(lead.organization_id, {"type": "status_change", "lead_id": str(lead.id), "status": lead.status})
    except Exception:
        logger.exception("process_incoming_reply crashed for lead_id=%s", lead_id)


def _lead_list_item(lead: Lead) -> dict:
    return {
        "id": str(lead.id),
        "name": lead.contact_name,
        "company": None,
        "email": lead.contact_email,
        "phone": lead.contact_phone,
        "channel": "website_form" if lead.source == "demo_sandbox" else lead.source,
        "status": lead.status,
        "createdAt": lead.created_at.isoformat(),
        "respondedAt": lead.responded_at.isoformat() if lead.responded_at else None,
        "responseTimeSeconds": lead.response_time_seconds,
        "calendlyBookingUrl": lead.calendly_booking_url,
        "bookedAt": lead.booked_at.isoformat() if lead.booked_at else None,
        "rejectionReason": lead.rejection_reason,
        "isLive": not lead.is_demo,
        "qualificationScore": lead.qualification_score,
        "pipelineStage": lead.pipeline_stage,
        "temperature": lead.temperature,
        "followUpCount": lead.follow_up_count,
        "nextFollowUpAt": lead.next_follow_up_at.isoformat() if lead.next_follow_up_at else None,
    }
