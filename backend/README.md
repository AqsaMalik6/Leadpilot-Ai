# LeadPilot AI — Backend

FastAPI implementation of `SKILL-BACKEND.md` — the real API behind everything `frontend/` currently mocks. See that file for the full spec (domain model, API surface, Groq/Agents SDK wiring, phased scope).

## Setup

```bash
python -m venv venv
venv\Scripts\pip install -r requirements.txt
copy .env.example .env   # then fill in DATABASE_URL's password and GROQ_API_KEY
```

Local Postgres (already running, inspected via pgAdmin):

```bash
# creates the leadpilot database if it doesn't exist yet — run once
venv\Scripts\python -c "import asyncio,asyncpg; asyncio.run(asyncpg.connect('postgresql://postgres:<password>@localhost:5432/postgres').then(lambda c: c.execute('CREATE DATABASE leadpilot')))"

venv\Scripts\python -m alembic upgrade head
venv\Scripts\python -m scripts.seed
```

Run the server:

```bash
venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info
```

`frontend/.env.local` already points `NEXT_PUBLIC_API_BASE_URL` at `http://localhost:8000`. Auth (signup/login/logout/session) and onboarding are wired end-to-end: `frontend/app/api/auth/*/route.ts` proxy to this backend server-to-server, and `frontend/middleware.ts` validates the session_id cookie against `/api/auth/me` for real before allowing `/dashboard` or `/onboarding` through. Leads/dashboard-data/team/integrations/billing/CMS still read `frontend/lib/fixtures/*` — swapping those is the next slice of this same integration work.

**Next.js redirect() gotcha (Next 14.2.35):** don't call `redirect()` in a Server Component right after `await cookies()` feeds an awaited cross-origin `fetch()` in the same function — it silently fails to redirect (200 instead of 307) even though `redirect()` does run, with no error anywhere. This is why the auth check lives in `middleware.ts` (Edge runtime, `NextResponse.redirect()`) rather than in `app/(app)/layout.tsx`. Confirmed by isolation testing across several fresh-restarted servers, not a fluke.

## Environment variables

See `.env.example` for the full list. The only one that unlocks the core feature (a real, live AI agent instead of a placeholder reply) is `GROQ_API_KEY` — get a free one at https://console.groq.com/keys. Every other third-party key (Resend, WhatsApp, Calendly) is optional; leaving it blank switches that provider to a console/log fallback rather than failing.

## What's real vs. simplified

- **Real**: every Phase 1 table/endpoint, the full Groq-powered two-stage agent pipeline (OpenAI Agents SDK, tools, guardrails), Postgres `LISTEN/NOTIFY`-backed SSE, signed sessions, Phase 2 CMS tables + admin CRUD + lexical uniqueness check, dummy billing.
- **Simplified / Phase 2, explicitly**: WhatsApp/email intake are real parsers with no live account to test against; Slack/HubSpot OAuth connect flows return 501; Celery is wired but off by default (`USE_CELERY=false`) since Redis isn't part of this setup; CMS content is only seeded with a representative sample (all pricing tiers/testimonials/case studies, one industry/comparison/blog post) since the frontend doesn't read from here yet regardless.

## Known limitations (see delivery notes for the full list)

- Groq's open-weight models occasionally emit malformed function-call syntax under multi-tool sequences (`openai.BadRequestError: tool_use_failed`). The pipeline retries once and never leaves inconsistent state, but very occasionally a lead's conversation ends with a generic "human review needed" message instead of a natural closing line — the lead's actual qualified/rejected/booked status is unaffected either way.
- `/api/demo/lead` and web-form intake exercise one real turn (fast-ack + a reasoning pass). A genuine multi-turn back-and-forth needs a live channel (WhatsApp/email) or a future chat-box UI — `process_incoming_reply` is already wired for that, just not exercised by today's one-shot demo form.

## Scripts

- `scripts/seed.py` — idempotent, safe to re-run. Seeds the public demo sandbox org + a representative CMS content sample.

## Tests

None written. Everything in this file was instead verified live against a real local Postgres instance and a real Groq API key over curl — see the delivery notes for the exact scenarios exercised. Adding a pytest suite (fixtures for a test DB, httpx `AsyncClient` against the app) is the natural next step before this goes further than a solo dev's laptop.
