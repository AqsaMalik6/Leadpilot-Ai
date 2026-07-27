# SKILL-BACKEND.md — LeadPilot AI

**Stack:** FastAPI (Python 3.12) · PostgreSQL 16, running locally (pgAdmin as the inspection GUI — no code depends on it) · SQLAlchemy 2.0 (async) + Alembic · OpenAI Agents SDK (qualification/decision agent, guardrails, handoffs, tools) running entirely on **Groq's free, OpenAI-compatible API** — zero OpenAI spend · Signed session-cookie auth (own scheme — see §6) · Resend/SendGrid (email) · SSE for dashboard real-time updates, backed by Postgres `LISTEN/NOTIFY`.

This backend implements the real API behind **every mock currently running in `frontend/`**. The frontend is fully built, verified, and *not being changed* by this spec — it already has real Zod contracts (`lib/schema/*.ts`), a data-layer seam (`lib/data/*.ts`) designed exactly for this swap, mock Route Handlers (`app/api/**/route.ts`) that are the literal contract this backend must satisfy, and `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` already pointed here, currently unused. Every shape below was checked field-by-field against that shipped code, not designed independently of it.

**Integration model (read this first):** FastAPI is called **server-to-server only** — from Next.js Route Handlers and Server Components — never directly from the browser. The browser keeps talking to same-origin `/api/*` on the Next.js app exactly as it does today; those handlers stop reading fixtures/cookies and start forwarding to this backend instead. This means no CORS configuration is needed on FastAPI, no frontend component changes are needed anywhere (only the *body* of `lib/data/*.ts` functions and `app/api/**/route.ts` handlers changes — precisely the seam the frontend was built with), and FastAPI can stay bound to localhost/internal network only.

**All JSON responses are camelCase**, matching `lib/schema/*.ts` verbatim — every Pydantic response model uses `alias_generator=to_camel` + `populate_by_name=True`. This one rule eliminates most of the integration drift a naive snake_case↔camelCase mismatch would otherwise cause.

---

## 1. Domain Model / Database Schema (Phase 1 — required for MVP)

```
organizations
  id (uuid, pk)
  name
  slug (unique)
  plan (enum: trial, starter, growth, scale, enterprise)   -- maps to a hardcoded plan-details table in code until pricing_tiers exists (Phase 2)
  billing_status (enum: active, past_due, canceled, trialing)
  stripe_customer_id (nullable)           -- unused until Phase 2 real billing
  stripe_subscription_id (nullable)
  branding_config (jsonb)                 -- logo url, primary color; future white-label
  created_at, updated_at

users
  id (uuid, pk)
  organization_id (fk -> organizations)
  email (unique, citext)
  password_hash                           -- argon2id
  role (enum: owner, admin, sales_rep)    -- also the source for /api/team; no separate team table in Phase 1
  full_name
  is_active
  onboarding_step (int, default 1)        -- replaces the frontend's throwaway lp_onboarding_step cookie; steps 1-4
  onboarding_completed_at (timestamptz, nullable)
  last_login_at
  created_at, updated_at

sessions
  id (uuid, pk)
  user_id (fk -> users)
  expires_at
  ip_address, user_agent
  created_at
  -- The session_id cookie value is a signed, opaque token (itsdangerous or a compact
  -- JWT) referencing this row's id, signed with SESSION_COOKIE_SECRET — the exact env
  -- var already scaffolded in frontend/.env.local.example (today it only signs
  -- lp_overlay). Reusing it means the frontend can eventually verify the cookie
  -- locally in middleware.ts without a network round-trip. Cookie name stays
  -- `session_id`; decoded payload stays SessionUser-shaped: {id, orgId, name, email,
  -- role, onboardingCompletedAt}. This is NOT "the same pattern as the JBD project" —
  -- JBD's hardcoded secure=false and demo-mode bypass are not carried over.

agent_configs                             -- one active config per organization
  id (uuid, pk)
  organization_id (fk, unique)
  persona (text)                          -- single free-text field — matches AgentConfigSchema.persona exactly (no separate name+tone split)
  qualifying_questions (jsonb)            -- array of {id, field, prompt, required} — field-for-field match to QualifyingQuestionSchema
  guardrails (text[])                     -- plain list of guardrail statements — matches AgentConfigSchema.guardrails exactly (not a topics/triggers/banned-claims object)
  handoff_threshold_score (int, 0-100)    -- plain number — matches AgentConfigSchema.handoffThreshold exactly
  calendly_link                           -- API-serialized as calendlyUrl
  system_prompt_override (text, nullable)
  active (bool)                           -- API field `active`, matching AgentConfigSchema.active
  created_at, updated_at

agent_config_history                      -- append-only version log; a bad prompt/guardrail edit must be revertible
  id (uuid, pk)
  agent_config_id (fk)
  snapshot (jsonb)                         -- full config at time of change
  changed_by_user_id (fk -> users)
  created_at

lead_channels                             -- connected intake sources per org
  id (uuid, pk)
  organization_id (fk)
  channel_type (enum: website_form, whatsapp, email)   -- "website_form", not "web_form" — matches ChannelSchema exactly
  config (jsonb)                          -- form embed key / WA phone id + token ref / inbox address
  is_active
  created_at

leads
  id (uuid, pk)
  organization_id (fk)
  channel_id (fk -> lead_channels, nullable for demo leads)
  source (enum: website_form, whatsapp, email, demo_sandbox)
  contact_name, contact_email, contact_phone (nullable)
  status (enum: new, qualified, booked, rejected)   -- dropped in_progress — not in LeadStatusSchema; a mid-conversation lead just stays "new" until the decision node flips it. Human takeover is tracked on conversations.status = handed_off instead, which never surfaces on the lead badge.
  -- Flattened qualification fields (avoid joining messages just to render the leads table/detail header):
  budget (text, nullable)
  timeline (text, nullable)
  need (text, nullable)
  company_size (text, nullable)
  decision_authority (bool, nullable)
  qualification_score (int, nullable)
  qualification_answers (jsonb)           -- array of {question, answer, field} — field-for-field match to QualificationAnswerSchema
  rejection_reason (text, nullable)
  calendly_booking_url (text, nullable)
  responded_at (timestamptz, nullable)    -- was missing; Lead.respondedAt requires it
  response_time_seconds (int, nullable)   -- API field responseTimeSeconds
  booked_at (timestamptz, nullable)       -- was missing; Lead.bookedAt requires it
  is_demo (bool, default false)           -- API field isLive = NOT is_demo
  assigned_rep_id (fk -> users, nullable)
  created_at, updated_at

conversations
  id (uuid, pk)
  lead_id (fk -> leads, unique)
  status (enum: active, completed, handed_off)
  created_at, updated_at

messages
  id (uuid, pk)
  conversation_id (fk -> conversations)
  role (enum: lead, agent, system)         -- dropped human_rep — MessageRoleSchema only has lead/agent/system; a human takeover still posts with role="agent" and metadata.human_rep_id set, so the transcript UI (which only knows these 3 roles) never breaks
  content (text)                            -- API field `text`, matching TranscriptMessageSchema
  channel (enum: website_form, whatsapp, email)
  metadata (jsonb)                          -- model used (always "groq" now), latency_ms, guardrail_flags, human_rep_id (nullable)
  created_at                                -- API field `timestamp`

notifications
  id (uuid, pk)
  organization_id (fk)
  lead_id (fk, nullable)
  type (enum: lead_qualified, lead_booked, lead_rejected, weekly_summary)
  channel (enum: email)                     -- Slack channel deferred to Phase 2 with the Slack integration itself
  status (enum: pending, sent, failed)
  payload (jsonb)
  sent_at
  created_at

contact_submissions                         -- new table — /api/contact was a discard-only stub in the frontend
  id (uuid, pk)
  name, email, company (nullable), message
  notified_at (timestamptz, nullable)
  created_at

integrations                                -- OAuth'd 3rd-party tools only (see merged-view rule below)
  id (uuid, pk)
  organization_id (fk)
  provider (enum: calendly, slack, hubspot)  -- salesforce dropped for MVP (Phase 2 add-back); website_form/whatsapp/email live in lead_channels, not here. Only calendly's connect flow is actually implemented in Phase 1 — slack/hubspot rows simply don't exist yet, so the merged view naturally reports them "not_connected" (matching the frontend's fixture today) with zero extra code.
  credentials_encrypted (bytea)              -- Phase 1: single Fernet key from env. Phase 2: KMS envelope encryption.
  status (enum: connected, error, disconnected)
  connected_at

audit_logs
  id (uuid, pk)
  organization_id (fk)
  actor_user_id (fk, nullable)
  action (text)
  target_type, target_id
  metadata (jsonb)
  created_at
```

**`GET /api/integrations` composes a merged view** — `lead_channels` rows (website_form/whatsapp/email, "connected" once configured) plus `integrations` rows (calendly/slack/hubspot) — into the one flat `Integration[]` list the frontend's `/dashboard/integrations` page already renders (confirmed against `lib/fixtures/integrations.ts`: all 6 providers in one array). This is composed at the API layer; the two tables stay separately normalized because their config shapes are genuinely different (a form embed key vs. an OAuth token).

Indexes: `leads(organization_id, status, created_at)`, `messages(conversation_id, created_at)`, `sessions(user_id, expires_at)`.

### Phase 2 — CMS content (deferred; not required for MVP)

`blog_posts`, `industries`, `case_studies`, `comparisons`, `testimonials`, `pricing_tiers` are **not** moving into Postgres in Phase 1. Today's frontend already serves all of this correctly and for free, straight from `lib/fixtures/*.ts` and `content/blog/*.mdx` — nothing currently fetches it from an API, so migrating it into the backend right now would cost real time for zero user-visible benefit. It becomes worth doing once there's an actual reason to edit this content without a code deploy (a real admin CMS UI). When that day comes, these are the corrected shapes (checked against the frontend's actual Zod schemas, unlike the originals):

- `industries`: add `hero_headline`, `hero_subhead`, `faqs` (jsonb, min 3), `relevant_channels`, `published_at` — the original table only had `pain_points`+`case_study_id`+`meta_description`, missing everything else `IndustrySchema` requires.
- `comparisons`: replace the vague `feature_matrix jsonb` with `feature_rows` (array of `{feature, leadPilot, competitor, note?}`, min 5), add `intro`, `when_to_choose_leadpilot`, `when_to_choose_competitor`, `faqs`.
- `testimonials` (new table): `quote, author_name, author_title, company_name, company_logo_url, avatar_url, metric_callout, is_illustrative bool not null default true`.
- `case_studies`: add `is_illustrative bool not null default true` — required by the frontend's honesty-policy labeling.
- `pricing_tiers` (new table): `name, tagline, monthly_price_cents, annual_price_cents, leads_included_per_month, feature_bullets jsonb, highlighted bool, cta_label, cta_href`.
- `blog_posts`: add `meta_title, tldr, author_title, author_avatar_src, tags, reading_time_minutes, related_slugs`; note the frontend stores body content as MDX *files*, not DB text — a real migration needs to decide whether Postgres holds the MDX body or just metadata pointing back at bundled files.

---

## 2. API Surface (FastAPI routers)

### 2.1 Auth (`/api/auth`)

```
POST   /api/auth/signup            -- creates organization + owner user, starts trial. Sets session_id cookie. Response: {ok: true, user: SessionUser}
POST   /api/auth/login             -- verifies password (argon2id), sets session_id cookie. Response: {ok: true, user: SessionUser}
POST   /api/auth/logout            -- deletes the sessions row server-side (not just cookie deletion — a stolen cookie must be revocable), clears cookie
GET    /api/auth/me                -- current SessionUser, 401 if no valid session
POST   /api/auth/forgot-password   -- Phase 2 (needs transactional email + reset-token flow beyond MVP's scope)
POST   /api/auth/reset-password    -- Phase 2
```

### 2.2 Onboarding (`/api/onboarding`)

```
GET    /api/onboarding/status      -- {step: number} — reads users.onboarding_step (replaces the frontend's lp_onboarding_step cookie 1:1)
POST   /api/onboarding/status      -- body {step: number} (1-4), updates users.onboarding_step
POST   /api/onboarding/complete    -- body {complete: true}; sets onboarding_completed_at, returns {ok: true, user: SessionUser} with a refreshed session cookie
POST   /api/onboarding/channel     -- register first lead channel (form/WA/email)
POST   /api/onboarding/agent       -- save initial qualifying questions + Calendly link
POST   /api/onboarding/test-lead   -- fires a synthetic lead through the live Groq pipeline
```

The frontend today has ONE URL for step-tracking (`app/api/auth/onboarding/route.ts`, `POST` with body either `{step}` or `{complete:true}`). That one Next.js route becomes a thin proxy that inspects the body and calls whichever of the two backend endpoints above matches — no new frontend URL, no component changes.

### 2.3 Lead intake (public-facing, unauthenticated, rate-limited)

```
POST   /api/intake/web-form/{form_key}     -- called from an embedded JS snippet on customer sites (Phase 1)
POST   /api/demo/lead                      -- public sandbox endpoint, is_demo=true. Highest-priority Phase-1 endpoint: it's what turns the frontend's /demo LiveDemoWidget from a client-side scripted simulation into a live call against the real Groq-powered agent.
POST   /api/intake/whatsapp/webhook        -- Phase 2 (needs a WhatsApp Business Cloud API account)
POST   /api/intake/email/webhook           -- Phase 2 (needs inbound-parse email setup)
```

Validated with Pydantic, creates `lead` + `conversation`, kicks off the two-stage Groq pipeline as an `asyncio` background task (see §4), returns `202 Accepted` immediately.

### 2.4 Dashboard — leads (`/api/leads`, session-auth required)

```
GET    /api/leads                  -- paginated, filter by status/channel/search — matches frontend's LeadFilters exactly. Response: {leads: LeadListItem[]}
GET    /api/leads/{id}             -- Response: {lead: Lead}, 404 -> {error: "Not found"}
POST   /api/leads/{id}/status      -- body {status: LeadStatus} — POST, not PATCH (matches the frontend's already-built route)
POST   /api/leads/{id}/handoff     -- assigns a sales_rep, flips conversations.status = handed_off, sends a notification
GET    /api/leads/stream           -- SSE: new_lead / status_change / heartbeat events, identical wire format to the frontend's already-working mock (`data: {type, ...}\n\n`), fed by Postgres LISTEN/NOTIFY (see §5)
```

### 2.5 Agent configuration (`/api/agent`)

```
GET    /api/agent/config            -- Response: AgentConfig (persona, qualifyingQuestions, handoffThreshold, calendlyUrl, guardrails, active)
PUT    /api/agent/config            -- writes an agent_config_history row, then updates
POST   /api/agent/config/preview    -- runs a config against a sample transcript without saving
```

### 2.6 Integrations (`/api/integrations`)

```
GET    /api/integrations                       -- merged view, see §1
POST   /api/integrations/calendly/connect      -- OAuth flow (Phase 1 — needed for the agent's "send Calendly link" tool call)
POST   /api/integrations/slack/connect         -- Phase 2
POST   /api/integrations/hubspot/connect       -- Phase 2
DELETE /api/integrations/{id}
```

### 2.7 Notifications (`/api/notifications`)

```
GET    /api/notifications
PUT    /api/notifications/rules
```

### 2.8 Team & org (`/api/team`, `/api/org`)

```
GET    /api/team                    -- maps from `users` directly: {id, name: full_name, email, role, avatarSrc: null, invitedAt: created_at, status}
POST   /api/team/invite             -- Phase 2 (needs transactional email)
DELETE /api/team/{user_id}
PUT    /api/org/settings
```

### 2.9 Billing (`/api/billing`) — read-only in Phase 1

```
GET    /api/billing/plan            -- reflects organizations.plan + a hardcoded plan-details map (no pricing_tiers table yet, see §1 Phase 2 note). Response matches BillingSchema: {planId, planName, leadsProcessedThisCycle, leadsIncluded, cycleEndsAt, invoices: []}
GET    /api/billing/usage
```

Real Stripe checkout/portal/webhook is Phase 2 — it needs a Stripe account and API keys that aren't part of this setup yet; wiring it before then would just be dead code.

### 2.10 Analytics/KPI (`/api/dashboard`)

```
GET    /api/dashboard/overview      -- ONE endpoint, not two (the original spec's separate /kpis + /trends were never both called by the frontend). Response: {summary: KpiSummary, timeseries: KpiTimeseriesPoint[], recentLeads: LeadListItem[]} — matches DashboardOverviewSchema exactly.
```

### 2.11 Contact (`/api/contact`)

```
POST   /api/contact                 -- persists to contact_submissions, sends an email via Resend/SendGrid. The frontend's stub today just validates and discards this — same ContactInputSchema either way.
```

### 2.12 CMS (`/api/cms/*`) — Phase 2, see §1

Not built in Phase 1 — this content is frontend-bundled today and stays that way until a real admin-editing need justifies the move.

---

## 3. AI Agent Architecture — OpenAI Agents SDK, running entirely on Groq

### 3.1 Why Groq-only

The product's core value prop is "reply before the competitor does." Groq's inference speed makes that true without spending anything on OpenAI's API — the OpenAI Agents SDK is a model-agnostic orchestration layer (guardrails, handoffs, tool-calling, tracing), and it supports pointing its underlying client at any OpenAI-compatible endpoint. Groq's API is exactly that.

```python
from openai import AsyncOpenAI
from agents import Agent, OpenAIChatCompletionsModel, Runner, set_default_openai_client, set_default_openai_api

groq_client = AsyncOpenAI(base_url="https://api.groq.com/openai/v1", api_key=settings.GROQ_API_KEY)
set_default_openai_client(groq_client)
set_default_openai_api("chat_completions")  # Groq serves Chat Completions, not the Responses API

fast_ack_agent = Agent(
    name="fast-ack",
    model=OpenAIChatCompletionsModel(model="llama-3.1-8b-instant", openai_client=groq_client),
    instructions="Acknowledge the lead within one short sentence and ask the first qualifying question.",
)

qualification_agent = Agent(
    name="qualifier",
    model=OpenAIChatCompletionsModel(model="llama-3.3-70b-versatile", openai_client=groq_client),
    instructions=AGENT_CONFIG_SYSTEM_PROMPT,   # built from agent_configs.persona + qualifying_questions + guardrails
    tools=[send_calendly_link, notify_sales_team, close_conversation],
    input_guardrails=[reject_prompt_injection],
    output_guardrails=[block_hallucinated_claims],
)
```

Confirm exact model IDs against Groq's live model list at build time — its hosted catalog rotates. `llama-3.3-70b-versatile` (or `openai/gpt-oss-120b` if available) is the current pick for the reasoning stage; `llama-3.1-8b-instant` for the fast-ack stage.

### 3.2 Two-stage reply pipeline (same shape as the original design, Groq-only now)

1. **Fast-ack stage**: instant acknowledgment + first qualifying question, sub-second on Groq.
2. **Reasoning/decision stage**: tracks slot-filling against `agent_configs.qualifying_questions`, applies guardrails, computes `qualification_score`, and either calls `send_calendly_link` + `notify_sales_team` (→ `status = qualified`, later `booked` on a Calendly webhook) or `close_conversation(reason)` (→ `status = rejected`, `rejection_reason` logged).
3. Every reasoning-stage turn is persisted as a `messages` row with `metadata.model = "groq"` and `metadata.latency_ms`, so the dashboard transcript view and any future cost/latency analysis have real data to show.

### 3.3 Prompt/config versioning

`agent_config_history` (see §1) — an append-only snapshot on every `PUT /api/agent/config`, so a bad edit is revertible. Critical for a product whose value proposition rests on trustworthy autonomous conversations with real leads.

### 3.4 Guardrail specifics

- Never invent pricing, discounts, or commitments not present in `agent_configs`.
- Refuse to discuss competitors by name in a disparaging way.
- Data-minimization: phone/email used only as needed for qualification, never passed to the model beyond what's necessary.
- Rate/abuse limiting on `/api/demo/lead` and `/api/intake/*` — Phase 1: an in-memory token bucket (fine at single-process MVP scale); Phase 2: Redis-backed once running multiple instances.

### 3.5 Honesty note

Groq's free tier has real requests/tokens-per-minute limits. Comfortably enough for MVP and demo traffic, but worth monitoring rather than assuming it holds at real production volume — flag this before it becomes a support incident, don't discover it live.

---

## 4. Background Jobs — Phase 1: asyncio, not Celery

No Redis, no Celery broker in Phase 1 — nothing about a local, single-developer MVP needs a distributed task queue yet, and standing one up is exactly the kind of setup cost that should be avoided before it's earned.

```
process_new_lead(lead_id)            -- FastAPI BackgroundTasks / asyncio.create_task; orchestrates the two-stage pipeline
send_notification(notification_id)   -- same
sync_calendly_booking(lead_id)       -- Calendly webhook handler updates lead status directly, no queue needed at this scale
```

`weekly_summary_digest` (scheduled) and `usage_billing_sync` (nightly) are Phase 2 — they're genuinely recurring/scheduled jobs that want Celery beat (or even just a cron-triggered script for MVP) rather than being forced into ad hoc asyncio loops.

**Phase 2 upgrade path**: once running more than one backend process, or once truly long-running/retryable jobs are needed, promote to Celery + Redis exactly as the original spec described — the job function signatures above don't need to change, only how they're invoked.

---

## 5. Real-time layer

`/api/leads/stream` (SSE) — Phase 1: the backend `LISTEN`s on a Postgres NOTIFY channel scoped per `organization_id` (triggered by a `NOTIFY` on lead insert/status update — a lightweight Postgres trigger, or an explicit `NOTIFY` call in the same transaction as the write) and forwards events to connected SSE clients. No Redis required at this scale — Postgres pub/sub is sufficient for one backend process serving a handful of concurrent dashboard sessions. Emits the exact same three event shapes the frontend already expects: `{type: "new_lead", lead}`, `{type: "status_change", leadId, status}`, `{type: "heartbeat", timestamp}`.

**Phase 2 upgrade path**: move to Redis pub/sub once running multiple backend instances (Postgres `LISTEN/NOTIFY` doesn't fan out across separate connections/processes as cleanly at that point).

## 6. Security

- Session cookies: `httpOnly`, `Secure` in production, `SameSite=Lax`, signed with `SESSION_COOKIE_SECRET` (shared with the frontend, already scaffolded in its `.env.local.example`), rotated on privilege change, backed by a server-side row in `sessions` with a TTL — real revocation on logout, not just a client-side cookie delete.
- Passwords: Argon2id.
- Integration credentials: Phase 1 — encrypted at rest with a single Fernet key from env (`INTEGRATION_ENCRYPTION_KEY`), never returned in API responses. Phase 2 — upgrade to KMS-managed envelope encryption once handling real customer OAuth tokens at scale.
- Public intake endpoints: request signing/verification on any real webhook (WhatsApp/Calendly), rate limiting, honeypot + timing heuristic on the web-form embed (no visible CAPTCHA degrading conversion).
- CORS: not needed for the browser at all under the server-to-server integration model (see top of doc) — FastAPI only needs to accept connections from the Next.js server, not arbitrary browser origins.
- Audit log on all state-changing dashboard actions.
- Multi-tenant isolation: every query scoped by `organization_id` from the session — never a client-supplied org id.

## 7. Deployment & environments — local-first

Phase 1 targets the user's own laptop, not managed cloud infra:

- `DATABASE_URL=postgresql+asyncpg://postgres:<password>@localhost:5432/leadpilot` — a local PostgreSQL 16 instance, inspected/queried via pgAdmin (already installed) purely as a GUI; nothing in the application code depends on pgAdmin itself.
- Alembic migrations run locally (`alembic upgrade head`) against that same instance.
- Application-side UUIDs (SQLAlchemy `default=uuid4`) rather than a Postgres extension (`pgcrypto`/`uuid-ossp`) — one less thing to enable.
- Env inventory: `GROQ_API_KEY`, `SESSION_COOKIE_SECRET` (shared with frontend), `INTEGRATION_ENCRYPTION_KEY`, `RESEND_API_KEY` (or SendGrid), `CALENDLY_CLIENT_ID`/`CALENDLY_CLIENT_SECRET` — the full Phase 1 env inventory.
- Structured JSON logging with request-id correlation, even at this scale — cheap to add now, painful to retrofit once debugging a live agent conversation in anger.

**Phase 2**: managed Postgres (Neon/RDS) + managed Redis, containerized deploy behind Nginx/Caddy with HTTPS, `staging`/`production` environments with Alembic gated in CI — once this moves off one laptop.

## 8. Backend support for SEO/AEO/GEO

Deferred along with CMS content itself (§1) — not relevant while that content is frontend-bundled. When Phase 2 CMS lands, the original spec's rules still apply as written: reject thin/duplicate content via a similarity check, expose `updated_at` for visible freshness signals, `/api/seo/sitemap-data` and `/api/seo/llms-index` only ever return published rows, `case_studies.metrics` must be real numbers, never fabricated.

## 9. MVP scope (Phase 1) vs. Phase 2 — the full picture in one place

**Phase 1 (build now):** `organizations`, `users` (+ onboarding fields), `sessions`, `agent_configs` (+ history), `lead_channels` (website_form active first), `leads`, `conversations`, `messages`, `notifications` (email only), `contact_submissions`, `integrations` (calendly first). Real signed sessions matching the frontend's cookie contract exactly. Web-form intake + `/api/demo/lead` wired to a real Groq-powered two-stage agent (OpenAI Agents SDK, guardrails, handoffs, tool-calls). Dashboard: leads list/detail/status/SSE (Postgres `LISTEN/NOTIFY`), one collapsed `/api/dashboard/overview` endpoint, agent config CRUD + versioning. Team from `users`. Billing read-only against `organizations.plan`. All of it running on a local Postgres instance with `asyncio` background tasks — no Redis, no Celery, no KMS, no managed cloud anything.

**Phase 2 (spec'd above, explicitly deferred, not silently dropped):** Use MCP connectors for WhatsApp + email intake channels.dummy Stripe billing, Celery + Redis, full CMS (industries/comparisons/blog/testimonials/case-studies/pricing_tiers move into Postgres with real admin CRUD + uniqueness moderation), roles beyond owner.

## 10. Phased build roadmap

Phase 0 — FastAPI scaffold, Alembic, local Postgres connection, health-check endpoint.
Phase 1 — Auth + sessions + onboarding, matching the frontend's cookie contract exactly.
Phase 2 — Agent pipeline core: OpenAI Agents SDK wired to Groq, `agent_configs` CRUD, `/api/demo/lead` live — the single highest-impact swap, since it turns the frontend's flagship `/demo` widget from a scripted simulation into a real product demo.
Phase 3 — Web-form intake + dashboard (leads/SSE/overview).
Phase 4 — Notifications (email) + contact-form persistence.
Phase 5 — Integrations: `lead_channels` + `integrations` merged view, Calendly OAuth.
Phase 6 — Billing read-only, team-from-users, polish/hardening.
Phase 7 (= "Phase 2" scope above) — everything explicitly deferred.

---

## Changelog vs. the original SKILL-BACKEND.md

- Fixed roughly 15 concrete drift points against the already-shipped frontend: `leads.status` enum, `web_form`→`website_form` renaming, missing `responded_at`/`booked_at`/flattened-qualification columns, `agent_configs` simplified to match the actually-editable UI, `integrations` provider enum + the `lead_channels`-merge rule, camelCase-everywhere API rule, `/api/dashboard/overview` collapsed from two endpoints, `POST` (not `PATCH`) for lead status.
- Replaced the "same pattern as JBD" auth note with the actual, already-scaffolded shared-secret signed-cookie approach.
- Re-platformed the AI pipeline onto Groq-only via the OpenAI Agents SDK's custom-client override, dropping the paid-OpenAI dependency entirely.
- Right-sized Phase 1 for a solo/local dev building fast: dropped Redis/Celery/KMS/managed-cloud-Postgres/live-Stripe/CMS-in-Postgres from MVP, each explicitly labeled Phase 2 rather than silently missing.
- Named two small, separate frontend follow-ups required once this backend is wired up for real (`lib/session.ts` decode→verify, `middleware.ts` presence-check→signature check) — not done in this pass.
