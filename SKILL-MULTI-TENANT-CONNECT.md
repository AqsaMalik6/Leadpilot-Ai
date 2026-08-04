# SKILL-MULTI-TENANT-CONNECT.md — Customers Connect Their Own Gmail/WhatsApp

**Goal:** Right now only YOUR Gmail is wired in. Change this so any customer, from their own dashboard, connects **their own** Gmail and **their own** WhatsApp number — and the exact same Digital FTE pipeline (already built and working) runs for them in real time. No demo mode, no shared/fake inbox.

**Scope note (answers "does it bring leads"):** This feature only connects a customer's **existing inbound channels** (their Gmail, their WhatsApp) to your existing AI pipeline. It does **not** go hunt new leads from outside sources (that's a separate outbound-scouting feature, like Leon & Vera's "LUCA" — not in scope here).

**Hard constraint (confirmed, not a workaround):** OAuth (Gmail) and WhatsApp webhooks both require a **public HTTPS URL**. This cannot work purely on localhost for external customers. Interim fix: run backend on your laptop, expose it via **Cloudflare Tunnel** (free) to get a public URL — real deployment can come later without rewriting anything below.

---

## 1. Data model change — from single-account to per-organization

```
gmail_accounts     -- already exists, just stop hardcoding to one org
  organization_id (fk)   -- already there
  google_oauth_tokens_encrypted
  status (enum: connected, token_expired, disconnected)

whatsapp_accounts  -- NEW, mirrors gmail_accounts
  organization_id (fk)
  waba_id, phone_number_id, access_token_encrypted
  status (enum: connected, disconnected)
```
Everything downstream (qualification agent, follow-up sweep, CRM pipeline, dashboard) **already scopes by `organization_id`** — this is why no rewrite is needed, only the connection layer changes from "1 hardcoded account" to "N accounts, one per org."

---

## 2. Gmail — customer self-connect flow

1. Dashboard → Settings → Integrations → **"Connect Gmail"** button.
2. Standard Google OAuth consent screen (`gmail.readonly` + `gmail.send` scopes) → redirects to `/api/oauth/gmail/callback`.
3. Callback stores tokens in `gmail_accounts` for **that customer's `organization_id`** (from their session).
4. Existing `gmail_poll_job` — change from "poll one inbox" to **"poll every row in `gmail_accounts` where status=connected"** — loop, not rewrite.

## 3. WhatsApp — customer self-connect flow

1. Dashboard → Settings → Integrations → **"Connect WhatsApp"** → Meta's **Embedded Signup** flow (customer logs into their own Meta Business account, picks/creates their WhatsApp number).
2. Meta returns `waba_id` + `phone_number_id` → store in `whatsapp_accounts` for that org.
3. **One shared webhook URL** (`/api/webhooks/whatsapp`) receives messages for **all connected customers** — Meta includes `phone_number_id` in every payload, so the handler looks up the right `organization_id` from `whatsapp_accounts` and routes the message into that org's existing pipeline.

## 4. What does NOT change
- Qualification agent, follow-up timers, CRM pipeline stages, dashboard — all already org-scoped, all reused as-is.
- Your own Gmail keeps working exactly as it does today (it just becomes "row #1" in `gmail_accounts` instead of the only row).

## 5. Sequencing (do this before real deployment)
1. Set up Cloudflare Tunnel → get a stable public HTTPS URL pointing at your laptop backend.
2. Register that URL as the Google OAuth redirect URI + Meta webhook URL (test mode/dev app first, not public app review yet).
3. Test with **one real second Gmail account + one real second WhatsApp number** (not a demo) end-to-end.
4. Only after that works do you need Google's OAuth app verification (required before *unlimited* strangers can connect — needed for public launch, not for early pilot customers).

## 6. Explicitly out of scope here
- Outbound lead sourcing/scraping (external portals, FSBO-style hunting) — separate future feature.
- Google's OAuth "app verification" for unlimited public users — needed later, not for pilot.
- Full production deployment — Cloudflare Tunnel is the bridge, not the destination.
