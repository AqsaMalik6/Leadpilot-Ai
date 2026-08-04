# SKILL-OUTBOUND-LEADS.md — Free Outbound Lead Finder (Updated: OSM + Geoapify + GitHub)

**Goal:** Same new dashboard page as before (`/dashboard/outbound-leads`), now with **three free sources** instead of one — routed automatically by category, so local-business leads and IT/tech leads both work from the same page.

**Cost constraint still $0:** OSM Overpass (free forever, no key) stays primary for general businesses. **Geoapify** added as fallback (free tier: daily request quota, no credit card). **GitHub Search API** added specifically for IT/tech leads (free with a personal access token — still $0, just requires a free GitHub signup, no billing).

---

## 1. Routing logic (this is the core change)

```
Category selected
      │
      ▼
Is category IT/tech-related?
(e.g. "software house", "SaaS", "AI agency", "developers")
      │
   ┌──┴──┐
  YES     NO
   │       │
   ▼       ▼
GitHub    OpenStreetMap Overpass (primary, free forever)
Search        │
API       Not enough results in this area?
   │           │
   │          YES
   │           │
   │           ▼
   │      Geoapify Places API (fallback, free daily tier)
   │           │
   └─────┬─────┘
         ▼
   AI Qualification (existing agent — scores fit, dedupes)
         │
         ▼
   Outbound Lead → outbound_leads table
```

---

## 2. Updated DB table

```
outbound_leads
  id, organization_id (fk)
  business_name, category
  address, phone, website (nullable), email (nullable)
  location (city/country, nullable)
  tech_stack (jsonb, nullable)       -- NEW, only populated by GitHub source
  github_org_or_user (text, nullable) -- NEW
  source (enum: osm, geoapify, github)  -- extended
  status (enum: found, added_to_campaign, contacted, rejected)
  found_at
```

---

## 3. Source A — OpenStreetMap Overpass (unchanged, still primary for non-IT)

Same as before: geocode location → Overpass query by category tag → parse name/address/phone/website → scrape public email from website if listed.

## 4. Source B — Geoapify (NEW, fallback only)

```
Tool: find_places_geoapify(category, location)
  1. Geoapify Places API call (category + location + radius) — free tier, daily quota
  2. Only triggered when Overpass returns too few results for that search
     (keeps daily quota usage low, since it's rate-limited unlike OSM)
  3. Parse: name, address, phone, website, category
  4. Same website-email-scrape step as Source A
  5. Same dedupe against existing outbound_leads/leads before saving
```
Why fallback, not primary: Geoapify's free tier has a **daily cap**, OSM doesn't — using OSM first keeps the whole feature sustainable at $0 without ever hitting a paywall.

## 5. Source C — GitHub Search API (NEW, for IT/tech leads only)

```
Tool: find_tech_leads(query_type, params)

  query_type = "hiring_companies"
    → GitHub search: "location:{location} language:{tech}"
    → Returns repos → extract owning org/user

  query_type = "startups_by_topic"
    → GitHub search: repos matching topic (e.g. "RAG", "AI SaaS", "CRM")
    → Extract org that owns the repo

  query_type = "org_lookup"
    → Direct: org:{name} → org profile (company, website, location, public email if set)

  For each match:
    - Fetch org/user profile: company, blog/website, location, public email (if exposed), bio
    - Fetch org's public repos → tech_stack = list of languages/topics used
    - If no public email → still save the lead (website + GitHub profile link as contact path),
      mark email as null — don't skip real leads just because email is hidden
```

**Auth note:** Use a free **GitHub Personal Access Token** (no billing, just a GitHub account) — unauthenticated GitHub API is capped at 60 requests/hour, authenticated free tier gets 5,000/hour. Store the token the same way other integration credentials are already stored (encrypted, org-level or app-level config).

---

## 6. Everything else — unchanged from the previous version
- Dashboard page, results table, "Add Selected to Campaign" button → same as before.
- Once added, leads flow into the **existing** `leads` table and your existing Gmail/WhatsApp/CRM pipeline — zero new sending logic.
- Still excludes LinkedIn scraping and paid enrichment (Apollo/Clay/ZoomInfo) — out of scope, same reasoning as before (ToS + budget).
- AI Qualification step (before saving as a lead) is the **same existing qualification agent**, just also scoring tech-fit/company-size signals when the source is GitHub.

## 7. Known limits (updated)
- GitHub only surfaces leads that are *technically active on GitHub* (real signal for software houses/AI companies, useless for e.g. real estate — hence the category-based routing, not used for everything).
- Public email on GitHub is often hidden by user choice — expected, handled by saving the lead anyway with website/GitHub-profile as the contact path instead of skipping it.
- Geoapify daily quota means heavy-volume days may temporarily fall back to OSM-only results — acceptable tradeoff to stay free.
