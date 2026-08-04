# SKILL-OUTBOUND-LEADS.md — Free Outbound Lead Finder (New Dashboard Page)

**Goal:** Add a **new page** to the existing dashboard where anyone can search "give me [category] leads in [location]" and get real, public business contacts pulled in — separate from the existing inbound Gmail/WhatsApp pipeline, which stays exactly as-is.

**Scope answer (confirmed via competitor research):** This is exactly what AiSDR/11x/Leon&Vera's "LUCA" do — a **separate sourcing module**, not something Gmail-connect gives you automatically. Building it now, cleanly separated, is the right move.

**Cost constraint:** Must be $0, no API key trial-credit tricks. → Using **OpenStreetMap Overpass API** (free forever, no key, no rate-limit paywall) — same tool your JBD project already uses for HotPepper/OSM business data, so this reuses skills, not new territory.

**Legal/ethical boundary (important):** This pulls **publicly listed business data only** (name, address, phone, website — same as a business directory). It does **not** scrape LinkedIn profiles or personal data — that violates LinkedIn's ToS and is out of scope, on purpose.

---

## 1. New DB table

```
outbound_leads
  id, organization_id (fk)
  business_name, category, address, phone, website (nullable), email (nullable, scraped from website if public)
  source (enum: osm)
  lat, lng
  status (enum: found, added_to_campaign, contacted, rejected)
  found_at
```

## 2. New dashboard page

```
/dashboard/outbound-leads
```
- Search form: **Category** (e.g. "real estate agency") + **Location** (city/area).
- Results table: business name, address, phone, website, email (if found) — checkbox select.
- Button: **"Add Selected to Outbound Campaign"** → inserts into existing `leads` table (source=`outbound`, pipeline_stage=`new`) — from here it flows through your **existing** qualification/follow-up pipeline, no new logic needed downstream.

## 3. Backend flow (MCP-style tool, reused by the existing Agents SDK setup)

```
Tool: find_local_businesses(category, location)
  1. Geocode location → lat/lng (Nominatim, same free OSM service, no key)
  2. Query Overpass API for `amenity`/`shop`/`office` tags matching category, within radius
  3. Parse results: name, address, phone, website tag
  4. For each result with a website: lightweight fetch of homepage/contact page,
     regex-extract a public email (mailto: links / visible email text only — no login walls, no scraping behind forms)
  5. Dedupe against existing `outbound_leads` + `leads` (by phone/website) before inserting
  6. Save to `outbound_leads`, return to frontend
```
Exposed as a tool the existing OpenAI Agents SDK agent can call (`find_local_businesses`) — same tool-calling pattern already used for Calendly/notify — not a new architecture, one more tool in the same agent.

## 4. Reuse, not rebuild
- Once a lead is "Added to Campaign," it becomes a normal row in your **existing** `leads` table → your **existing** Gmail/WhatsApp outbound-send logic, follow-up timers, and CRM pipeline stages handle it exactly like an inbound lead. Zero new sending/follow-up code needed.
- Dashboard components (table, status badges) reuse what's already built for the leads list.

## 5. Known limits (be upfront about these)
- OSM data completeness varies by city/country — dense in Europe/US, patchier in some regions; good enough for a real MVP, not as complete as paid tools (Apollo/Clay) — acceptable tradeoff for $0 cost.
- Email extraction only works when a business publicly lists an email on their own website — no guessing, no purchased data, no LinkedIn — this is intentional, keeps it 100% compliant.
- No "intent signals" (funding, hiring) like AiSDR/Rox do — that data isn't free anywhere; out of scope for the free version.

## 6. Out of scope (explicitly, for now)
- LinkedIn scraping/outreach — ToS violation, not building this.
- Paid enrichment APIs (Apollo, Clay, ZoomInfo) — revisit only if budget becomes available.
- Intent-signal detection (funding rounds, hiring surges) — needs paid data sources.
