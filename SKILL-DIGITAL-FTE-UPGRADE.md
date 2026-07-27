# SKILL-DIGITAL-FTE-UPGRADE.md — LeadPilot AI: CRM → Digital Sales FTE

**Goal:** Extend the existing frontend/backend (no rebuild). Turn LeadPilot from a CRM-with-AI-replies into an autonomous agent that decides when to reply, follow up, stop, schedule, classify, and notify — on its own.

**Reuse, don't replace:** Groq (real), WhatsApp Cloud API (real, code stays but **feature-flagged off** for now via a settings toggle — Gmail is priority), Resend Email (real), Calendly link (real, now extended with a webhook), CRM dashboard (real, now self-updating).

**Hard constraint:** No paid hosting assumed. Every feature below is tagged **[LOCAL]** (works today on localhost) or **[DEPLOY]** (needs a public URL/always-on process) — deploy-tagged items still get full code structure now, just not activated.

**Corrected against the actual codebase** (`backend/app/main.py`, `app/models/lead.py`, `app/models/notification.py`, `app/core/encryption.py`, `app/routers/leads.py`, `app/routers/intake.py`, `requirements.txt`) — every claim below about "existing patterns" has been checked against what's actually there, not assumed. See the changelog at the bottom for exactly what changed from the first draft and why.

---

## 0. Ground truth this spec builds on

- `app/main.py`'s `lifespan` is currently a no-op (`yield` only) — there is **no existing recurring-job pattern** to reuse. Celery/beat exists in code but is fully off (`USE_CELERY=false`) and wired to nothing. Both new background loops below (§2, §3) are the first recurring jobs this app will actually run, implemented as plain `asyncio.create_task` loops started in `lifespan` — no new dependency, no paid infra, matches the hard constraint.
- WhatsApp intake is **one endpoint inside `app/routers/intake.py`**, alongside web-form and email — there is no standalone `whatsapp_router` to comment a single include-line out of. §4 corrects this.
- `Lead.status` (`new/qualified/booked/rejected`) is load-bearing across the entire shipped dashboard (badges, filters, `LeadStatusSchema`, `GET /api/leads?status=`). The new `pipeline_stage` field must be strictly additive — §6 defines the one-directional sync rule.
- `app/core/encryption.py` already provides Fernet-based `encrypt_credentials`/`decrypt_credentials`, used today for Calendly's stored link. Gmail's OAuth tokens reuse this exact helper — no new encryption scheme.
- `channel_type`, `lead_source`, and `message_channel` are three separate native Postgres ENUM types (not one shared type), currently `("website_form", "whatsapp", "email")` / `(..., "demo_sandbox")`. Adding Gmail as a channel needs a real migration against all three (§1).

---

## 1. New DB additions (extend existing schema, don't rewrite)

```
leads
  + pipeline_stage (enum: new, contacted, qualified, meeting_scheduled, proposal_sent, won, lost)
  + temperature (enum: hot, warm, cold; default warm)
  + last_inbound_at (timestamptz)
  + last_outbound_at (timestamptz)
  + follow_up_count (int, default 0)
  + next_follow_up_at (timestamptz, nullable)

conversations
  + memory_summary (text, nullable)   -- rolling AI context summary, see §2 for the trigger

agent_actions   -- NEW table: "AI reasoning" + timeline log the dashboard reads from.
  -- Deliberately NOT a reuse of the existing audit_logs table: audit_logs is an
  -- internal, human-actor security/compliance trail (actor_user_id, generic action
  -- string); agent_actions is a lead-scoped, customer-facing reasoning feed. Different
  -- consumer, different shape — collapsing them would be wrong.
  id, lead_id, organization_id,
  action_type (enum: replied, followed_up, marked_cold, scheduled_meeting,
      classified_temperature, notified_owner, updated_pipeline_stage, manual_override)
  reasoning (text)        -- short AI-generated "why" — this is what the dashboard shows as "AI reasoning"
  created_at

gmail_accounts   -- NEW table
  id, organization_id, email_address, oauth_tokens_encrypted (bytea, via app/core/encryption.py),
  last_history_id (text, nullable)   -- Gmail History API cursor, see §2
  last_synced_at, is_active
```

**Migration mechanics (new, not in the original draft):** the three existing channel enums need `"gmail"` added via raw SQL in a dedicated Alembic migration — autogenerate does not emit `ADD VALUE`:

```python
def upgrade():
    op.execute("ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'gmail'")
    op.execute("ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'gmail'")
    op.execute("ALTER TYPE message_channel ADD VALUE IF NOT EXISTS 'gmail'")
```
Safe inside a transaction as long as the new value isn't used in the same transaction — a plain migration naturally satisfies that.

---

## 2. Gmail — [LOCAL] polling now, [DEPLOY] push later

**Connecting an account is [LOCAL], not deploy-gated** (this was unspecified in the first draft, which jumped straight to polling). Unlike Calendly, Google allows `http://localhost` redirect URIs for installed/desktop-app OAuth clients. One-time setup:
```
backend/scripts/gmail_oauth_setup.py   -- run once locally, google-auth-oauthlib installed-app
                                        -- consent flow, writes the resulting refresh token into
                                        -- gmail_accounts via app/core/encryption.py's existing helper
```
Add `google-api-python-client` and `google-auth-oauthlib` to `requirements.txt`.

**[LOCAL] Polling worker** (`gmail_poll_job`, an `asyncio.create_task` loop started in `app/main.py`'s `lifespan`, `while True: ... await asyncio.sleep(60)`, wrapped in try/except per iteration so one bad poll never kills the loop):
1. For each active `gmail_accounts` row, sync via `users.history.list` using the stored `last_history_id` cursor — **not** a date-based `after:` query (which can miss same-day messages or reprocess duplicates; History API is Google's documented incremental-sync pattern and is cheaper on quota). Update `last_history_id` after each successful sync.
2. Per new message → run through the **existing** qualification agent (same Groq-powered pipeline already built for web-form leads), with an added first step: `classify_is_lead(email_text) -> bool` — one cheap call on the same fast-model tier already used for `fast_ack` (`app/agent/client.py`'s `groq_client`, `settings.groq_fast_model`), strict system prompt forcing a `yes`/`no` answer. Not a new model integration — same cost/latency class as the existing fast-ack call.
3. If lead → create/update `leads` + `conversations(channel=gmail)`, generate a reply via the existing agent, send via the Gmail API `send`, log an `agent_actions` row with reasoning. If the send fails, log a console-fallback and continue (same graceful-degradation convention already used in `whatsapp_service.py`/`email_service.py`) — never crash the poll loop over one bad send.
4. If not a lead → skip, no CRM entry (avoid polluting the pipeline with spam/newsletters).

**Conversation memory — concrete trigger** (the first draft said "rolling summary" without specifying when): after each turn, if the conversation's replayed history exceeds 12 messages, summarize the oldest portion into `conversations.memory_summary` via one small Groq call and replay `[memory_summary] + last 12 messages` instead of the full transcript. Bounds both cost and context size as a Gmail thread grows long.

**[DEPLOY] Gmail Push Notifications** (Pub/Sub webhook) — replaces polling with real-time push. Code structure ready now:
```
/api/webhooks/gmail   -- POST handler, same shape as an already-planned webhook, just inactive until a public URL exists
```
Why deploy-only: Gmail push requires a Google Cloud Pub/Sub topic pushing to a **publicly reachable HTTPS endpoint** — localhost can't receive it. Polling is the local-safe equivalent and reuses the same downstream processing function, so switching later is a one-line trigger change, not a rewrite.

---

## 3. Follow-up & cold logic — [LOCAL], reuses the same `asyncio` scheduler pattern as §2

Single background job (`follow_up_sweep`, its own `asyncio.create_task` loop, runs every 15 min):
```
for lead in leads where pipeline_stage not in (won, lost) and temperature != cold:
    if now - last_inbound_at > 24h and follow_up_count == 0:
        send polite follow-up (Gmail or WhatsApp per channel)
        follow_up_count += 1
        log agent_actions(action_type=followed_up, reasoning=...)
    elif now - last_inbound_at > 48h and follow_up_count == 1:
        temperature = cold                      -- pipeline_stage is untouched here
        log agent_actions(action_type=marked_cold, reasoning=...)
        notify owner (dashboard notification)
```
This is the **AI decision-making layer** in practice: not a separate "AI decides" black box, but this rule set + the qualification agent's own confidence score feeding `temperature` (hot/warm/cold) on every reply, not just on timeout.

---

## 4. WhatsApp — kept, feature-flagged, not deleted

WhatsApp intake lives inside `app/routers/intake.py`'s `whatsapp_webhook()`, alongside web-form and email — there's no separate router to comment out. The accurate mechanism:

```python
# app/config.py
whatsapp_channel_enabled: bool = False   # flip to true to re-enable, no code edit needed

# app/routers/intake.py
@router.post("/whatsapp/webhook", status_code=202)
async def whatsapp_webhook(...):
    if not settings.whatsapp_channel_enabled:
        raise HTTPException(status_code=503, detail="WhatsApp channel is currently disabled")
    ...
```
No logic removed, nothing physically deleted. The moment the flag flips, WhatsApp flows through the exact same qualification/follow-up/CRM/`agent_actions` pipeline Gmail uses — that shared pipeline is the whole point of building Gmail this way.

---

## 5. Calendly — [LOCAL] webhook receiver, [DEPLOY] to receive real events

```
/api/webhooks/calendly   -- POST handler: on invitee.created event ->
    - verify Calendly's webhook signing signature (a shared secret) before trusting the payload
    - find lead by email
    - pipeline_stage = "meeting_scheduled"  (sync rule in §6 also sets status = "booked")
    - send confirmation email (Resend)
    - create dashboard notification
    - log agent_actions(action_type=scheduled_meeting)
```
**Signature verification is required, not optional** (missing from the first draft) — without it, anyone who finds the URL can POST a fake `invitee.created` and mark an arbitrary lead as booked. Registering the webhook subscription itself needs one real Calendly API call using `CALENDLY_CLIENT_ID`/`CALENDLY_CLIENT_SECRET` (already reserved, unused, in `.env`) once a public URL exists.

Why deploy-only to actually fire: Calendly webhooks POST to a public URL registered in Calendly's dashboard — same limitation as Gmail push. **Local workaround:** test via `ngrok`/`localtunnel` before real deployment, without changing the handler.

---

## 6. CRM auto-pipeline

`pipeline_stage` is a new, more granular field that sits **alongside** the existing `status` field — it does not replace it, and the existing dashboard (badges, filters, `LeadStatusSchema`) needs zero changes. Whenever `pipeline_stage` is written, apply this one-directional sync so the two fields never diverge:

```
pipeline_stage = contacted            -> status stays "new"
pipeline_stage = qualified            -> status = "qualified"
pipeline_stage = meeting_scheduled,
  proposal_sent, or won               -> status = "booked"
pipeline_stage = lost                 -> status = "rejected"
temperature = cold                    -> orthogonal signal, never touches status or pipeline_stage
```

`pipeline_stage` transitions are **only** ever written by backend logic (never a raw dashboard dropdown edit as the primary path — manual override stays available via the existing `POST /api/leads/{id}/status` in `app/routers/leads.py`, but that handler now also logs an `agent_actions` row with `action_type=manual_override` noting it was a human change):

```
new → contacted           (on first AI reply sent)
contacted → qualified     (qualification agent's score crosses threshold, same threshold field already in agent_configs)
qualified → meeting_scheduled   (Calendly webhook/local-test, §5)
meeting_scheduled → proposal_sent   (manual — no reliable auto-signal yet; dashboard action)
proposal_sent → won/lost  (manual — outcome isn't inferable from conversation alone)
any stage → temperature=cold   (§3 follow-up sweep; does not change pipeline_stage, it's an orthogonal signal)
```

---

## 7. Dashboard additions (extend existing dashboard, don't rebuild it)

New endpoint needed to back these (missing from the first draft, which described the UI but not its data source): `GET /api/leads/{id}/actions` — returns that lead's `agent_actions`, newest first.

Add to the existing lead-detail view (`frontend/components/dashboard/lead-detail-view.tsx`):
- **AI reasoning feed** — reads the new endpoint, newest first, plain-language reasoning strings.
- **Follow-up status** — `follow_up_count`, `next_follow_up_at`, temperature badge.
- **Lead timeline** — unified chronological view merging `messages` + `agent_actions` (the existing `LiveTranscript` component just needs to also render `agent_actions` rows, not a new component).
- **Notifications panel** — existing notifications table, now also fed by `scheduled_meeting`, `marked_cold`, `notified_owner` action types.

No new pages required — this is additive to `/dashboard/leads/[id]` and the existing notifications component. New thin read layer: `frontend/lib/data/agent-actions.ts` + `frontend/lib/schema/agent-action.ts`, same shape as every other `lib/data/*.ts` file already in the app.

---

## 8. Local vs Deploy — summary table

| Feature | Local (today) | Needs deployment |
|---|---|---|
| Gmail OAuth connection | ✅ one-time local installed-app flow | — (genuinely local, not deploy-gated) |
| Gmail lead detection + AI reply | ✅ via 60s History API polling | Push notifications (real-time) |
| Gmail conversation memory | ✅ (12-message rolling summary trigger) | — |
| Follow-up / cold marking | ✅ asyncio scheduler | Always-on reliability (24/7 uptime) |
| CRM auto-pipeline updates | ✅ (additive to existing `status`) | — |
| Calendly → CRM update | Code + signature verification ready, test via ngrok | Real webhook needs public URL |
| WhatsApp | Code kept, feature-flagged off (`whatsapp_channel_enabled`) | Re-enable anytime, no rewrite |
| Dashboard AI reasoning/timeline | ✅ (new `GET /api/leads/{id}/actions`) | — |

**Bottom line:** everything that doesn't require the outside world to reach *your* machine works locally today. The only true blockers are inbound webhooks (Gmail push, Calendly) — both have a local-safe fallback (polling, ngrok) so nothing is blocked on deployment, it just runs less instantly until you deploy.

---

## 9. Changelog from the first draft

- Corrected a false claim that a recurring-job pattern already exists (`app/main.py`'s `lifespan` was actually a no-op) — specified the real `asyncio.create_task` mechanism.
- Added the missing Gmail OAuth connection flow (the first draft jumped straight to polling) and marked it correctly as `[LOCAL]`.
- Switched Gmail sync from a date-based `after:` query to the History API (`last_history_id` cursor) — more correct, avoids missed/duplicate messages.
- Corrected the WhatsApp "one line to re-enable" claim — no standalone router exists; replaced with a `whatsapp_channel_enabled` settings flag matching the real file layout.
- Added the explicit `status` / `pipeline_stage` sync rule so the new field can't silently diverge from the existing, dashboard-critical `status` field.
- Added Calendly webhook signature verification (missing entirely from the first draft — a real security gap otherwise).
- Named `agent_actions` as deliberately distinct from the existing `audit_logs` table, and why.
- Added the missing `GET /api/leads/{id}/actions` endpoint that §7's UI actually depends on.
- Named the exact existing call site (`app/routers/leads.py`'s `update_status`) for manual-override logging.
- Gave `classify_is_lead` and `memory_summary` concrete implementations instead of naming them without mechanics.
- Cleaned up a stray editing artifact in the original follow-up pseudocode (`pipeline_stage = "lost" is wrong — set temperature = "cold"`).

**Rating of the pre-this-pass draft: 7.5/10.** The local-vs-deploy tagging discipline and the additive, no-rebuild architecture were the right call from the start — reusing the existing qualification agent across channels instead of building a parallel one was the correct design decision. What kept it from a 10: several load-bearing details were either factually wrong against the actual codebase (the scheduler claim, the WhatsApp router structure) or missing entirely (the Gmail OAuth flow, enum migration mechanics, webhook signature verification, the `status`/`pipeline_stage` sync rule) — the gap between a strong outline and an implementation-ready spec.
