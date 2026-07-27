"""SKILL-DIGITAL-FTE-UPGRADE.md §2 — Gmail polling worker.

Structure and logic are real and complete; this genuinely cannot be end-to-end tested
in this environment because no Google Cloud OAuth client exists yet (that requires the
user to create one in Google Cloud Console — an account-creation step no automated
process can do on their behalf, same reason Slack/HubSpot OAuth stayed disabled
earlier in this project). Until a `gmail_accounts` row exists (via
scripts/gmail_oauth_setup.py), this loop finds zero active accounts and no-ops —
correct, cheap behavior, not a stub pretending to work.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.agent.pipeline import classify_is_lead, process_incoming_reply, process_new_lead
from app.db import SessionLocal
from app.models.gmail import GmailAccount
from app.models.lead import Conversation, Lead, Message
from app.services.gmail_service import GMAIL_SDK_AVAILABLE, fetch_new_messages, parse_message, refresh_and_store_if_needed, send_reply

logger = logging.getLogger("leadpilot.jobs.gmail_poll")

POLL_INTERVAL_SECONDS = 60


async def _agent_message_ids(db, conversation_id) -> set:
    return set(
        (await db.execute(select(Message.id).where(Message.conversation_id == conversation_id, Message.role == "agent"))).scalars().all()
    )


async def _new_agent_messages(db, conversation_id, before_ids: set) -> list[Message]:
    """A new Gmail lead runs fast_ack + a reasoning turn, which can produce two agent
    messages in one pipeline call. Email isn't a live chat channel — sending them as
    two separate emails reads as a glitchy double-reply, so this collects every agent
    message the turn actually created and the caller sends them as one combined email,
    keeping the dashboard transcript and what the lead actually received identical."""
    all_msgs = (
        await db.execute(
            select(Message).where(Message.conversation_id == conversation_id, Message.role == "agent").order_by(Message.created_at)
        )
    ).scalars().all()
    return [m for m in all_msgs if m.id not in before_ids]


async def _process_account(db, account: GmailAccount) -> int:
    creds = await refresh_and_store_if_needed(account, db)
    raw_messages, new_history_id = fetch_new_messages(creds, account.last_history_id)

    processed = 0
    logger.info("gmail_poll: fetched %d raw message(s) for account_id=%s", len(raw_messages), account.id)
    for raw in raw_messages:
        parsed = parse_message(raw)
        if not parsed["text"]:
            logger.info("gmail_poll: skipping message from=%s subject=%r — empty/unparseable body", parsed["from_email"], parsed["subject"])
            continue
        if parsed["from_email"].lower() == account.email_address.lower():
            # The agent's own replies land back in this same inbox whenever the
            # connected account and the test "customer" address are the same Gmail
            # account (real production use always has two different addresses, so
            # this only bites test setups) — without this guard, every outbound reply
            # gets re-ingested as a brand-new inbound lead message and the agent
            # ends up replying to itself in an endless loop.
            logger.info("gmail_poll: skipping self-sent message (from == connected account %s) — not a real inbound reply", account.email_address)
            continue

        existing_lead = (
            await db.execute(
                select(Lead).where(
                    Lead.organization_id == account.organization_id,
                    Lead.contact_email == parsed["from_email"],
                    Lead.status == "new",
                )
            )
        ).scalars().first()

        # classify_is_lead only gates brand-new senders (spam/newsletter filtering, §2
        # point 4). A reply within an already-open lead conversation is a continuation,
        # not a fresh inquiry — running the same "does this read like a lead?" classifier
        # on a short reply like "yes that works" or "tell me more" would misclassify it as
        # not-a-lead and silently drop it, breaking the conversation mid-thread.
        if not existing_lead:
            is_lead = await classify_is_lead(parsed["text"])
            if not is_lead:
                continue

        if existing_lead:
            conversation = (await db.execute(select(Conversation).where(Conversation.lead_id == existing_lead.id))).scalar_one()
            before_ids = await _agent_message_ids(db, conversation.id)
            await process_incoming_reply(existing_lead.id, parsed["text"])
            new_msgs = await _new_agent_messages(db, conversation.id, before_ids)
            if new_msgs:
                combined = "\n\n".join(m.content for m in new_msgs)
                send_reply(creds, parsed["from_email"], f"Re: {parsed['subject']}", combined, parsed["thread_id"])
        else:
            lead = Lead(
                organization_id=account.organization_id,
                source="gmail",
                contact_name=parsed["from_name"],
                contact_email=parsed["from_email"],
                status="new",
                qualification_answers=[],
            )
            db.add(lead)
            await db.flush()
            conversation = Conversation(lead_id=lead.id, status="active")
            db.add(conversation)
            await db.flush()
            db.add(Message(conversation_id=conversation.id, role="lead", content=parsed["text"], channel="gmail", message_metadata={"gmail_thread_id": parsed["thread_id"]}))
            await db.commit()

            before_ids = await _agent_message_ids(db, conversation.id)
            await process_new_lead(lead.id)
            new_msgs = await _new_agent_messages(db, conversation.id, before_ids)
            if new_msgs:
                combined = "\n\n".join(m.content for m in new_msgs)
                send_reply(creds, parsed["from_email"], f"Re: {parsed['subject']}", combined, parsed["thread_id"])

        processed += 1

    account.last_history_id = new_history_id
    account.last_synced_at = datetime.now(timezone.utc)
    await db.commit()
    return processed


async def gmail_poll_once() -> int:
    if not GMAIL_SDK_AVAILABLE:
        return 0
    total = 0
    async with SessionLocal() as db:
        accounts = (await db.execute(select(GmailAccount).where(GmailAccount.is_active.is_(True)))).scalars().all()
        for account in accounts:
            try:
                total += await _process_account(db, account)
            except Exception:
                logger.exception("gmail_poll failed for account_id=%s — continuing with the rest", account.id)
    return total


async def gmail_poll_loop() -> None:
    while True:
        try:
            count = await gmail_poll_once()
            if count:
                logger.info("gmail_poll: processed %d new lead message(s)", count)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("gmail_poll_loop iteration crashed — retrying next interval")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
