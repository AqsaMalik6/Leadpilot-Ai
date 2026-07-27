# SKILL-FRONTEND.md — LeadPilot AI

**Product:** LeadPilot AI — an autonomous AI Sales Development Rep ("Digital FTE") that replies to inbound leads instantly, qualifies them, books demo calls, and reports everything on a live dashboard.

**Category:** AI SDR / Sales Agent SaaS (same category as Lindy AI's SDR agent, Artisan (Ava), Alignment AI, 11x.ai (Alice/Ali), Regie.ai)

**Build target:** Autonomous construction by Antigravity from this spec. Every section below is implementation-ready — no follow-up design decisions should be needed.

**Stack:** Next.js 14+ (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · Framer Motion · React Query (TanStack Query) · Zod · next-seo / native Metadata API · `lucide-react` (icons) · `react-hook-form` + `@hookform/resolvers/zod` (forms) · Recharts (dashboard charts) · Playwright (e2e) + Vitest (unit/component tests)

**Backend status:** No backend exists yet. A FastAPI + Pydantic backend (`SKILL-BACKEND.md`) is **planned but not built**. Section 4 defines a fixture-first data layer so the frontend is fully buildable today, with an explicit, single seam to swap in the real API later without touching components. Treat any auth, persistence, or "live" behavior described below as a faithful simulation of the real thing, not production infrastructure — see §4.6.

---

## 1. Competitive Flow Analysis (why the site is structured this way)

All five competitors converge on the same battle-tested SaaS-landing anatomy because it's what converts B2B buyers evaluating an "AI employee" category:

| Site | Core flow pattern observed |
|---|---|
| **Lindy AI** (lindy.ai/sdr) | Hero with "hire your AI SDR" framing → template/use-case gallery → how-it-works steps → integrations wall → testimonials → pricing tiers → FAQ |
| **Artisan** (artisan.co) | Bold single-agent branding ("Ava") → provocative hero line → workflow automation breakdown (find → enrich → write → send) → data/database proof points → security/trust section → CTA-heavy throughout |
| **Alignment AI** (alignment.ai) | Enterprise-leaning hero → outcome metrics (hours saved, meetings booked) → platform architecture diagram → compliance/trust → case studies → demo-request CTA (not self-serve signup) |
| **11x.ai** | Named-agent branding (Alice/Ali) → "digital worker" positioning vs SaaS tool → ROI calculator → logos/social proof band → integration marketplace → tiered pricing |
| **Regie.ai** | Category-education hero (AI SDR vs AI-assisted) → workflow builder screenshots → content/personalization emphasis → GTM team persona pages → resource hub for SEO |

**LeadPilot AI adopts the common denominator + differentiates on speed-to-value:**
Hero (agent framing) → Problem/agitation (slow response = lost leads) → How It Works (4-step flow from the 1-pager) → Live interactive demo widget → Feature/capability grid → Integrations → Social proof → Pricing → FAQ (AEO-structured) → Final CTA → Resource/blog hub (SEO engine) → Footer.

This is the flow implemented in Section 3 below.

---

## 2. Design System

### 2.1 Brand direction
A **digital employee**, not a dashboard tool. Visual language should feel closer to a modern HR/hiring product crossed with a sales-ops product — warm-but-technical, not generic "AI purple gradient" cliché. Avoid the over-used violet-to-blue SaaS gradient; competitors already lean on it, so LeadPilot differentiates with a **deep ink + signal-green** palette (green = "qualified lead," an intuitive metaphor carried through the whole UI).

### 2.2 Color tokens (Tailwind config)
```
--color-ink-950:   #0B0F0E   /* primary background, dark mode base */
--color-ink-900:   #12181A
--color-ink-700:   #1E2A2D
--color-surface:   #FFFFFF
--color-surface-2: #F5F7F5
--color-signal-500:#22C55E   /* "qualified" green — primary brand accent */
--color-signal-600:#16A34A
--color-amber-500: #F59E0B   /* "new lead" state */
--color-blue-500:  #3B82F6   /* "booked" state */
--color-blue-700:  #1D4ED8
--color-red-500:   #EF4444   /* "rejected / time-waster" state */
--color-slate-500: #64748B   /* neutral text ONLY — never repurposed as a status color */
--color-line:      #E5E7EB
```
Dark hero sections use `ink-950` background with `signal-500` accents on CTAs and live-status dots (mirrors the lead-status system used in the actual dashboard — this visual echo is intentional and reinforces the product's own UI in marketing pages).

**Status color map (canonical, used everywhere — marketing mockups and the real dashboard):** New = `amber-500` · Qualified = `signal-500` · Booked = `blue-500` · Rejected = `red-500`. `slate-500` is reserved strictly for neutral body/secondary text, never a fourth status — this was an inconsistency in earlier drafts of this spec (Rejected was implied as both slate and red) and is now resolved: Rejected is red, full stop.

**Contrast rule (non-negotiable — closes a real accessibility gap):** `signal-500`, `amber-500`, and `red-500` all fail WCAG AA contrast (≥4.5:1) against white text at normal weight/size — `signal-500` on white text is only ~1.9:1. Two fixed patterns:
- **Solid CTA buttons** on a `signal-500`/`amber-500`/`red-500` background use **`ink-950` text**, never white.
- **Status badges/pills** never use a solid saturated background with white text. They use a *tinted* background at low opacity + a darker solid-color text/border of the same hue, e.g. `bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30`, `bg-signal-500/10 text-signal-600 ring-1 ring-signal-500/30`, `bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/30`, `bg-red-500/10 text-red-700 ring-1 ring-red-500/30`. This is the only approved `Badge`/`StatusBadge` rendering and must pass automated contrast checks (§5.6, §8 Phase 7).

### 2.3 Typography
- **Display / headings:** `Geist` or `Inter Tight`, weight 600–700, tight tracking (-0.02em)
- **Body:** `Inter`, 400/500, 16px base, 1.6 line-height
- **Monospace (for code snippets, API keys, agent "thinking" transcripts):** `JetBrains Mono`
- Type scale: `text-sm(14) / base(16) / lg(18) / xl(20) / 2xl(24) / 3xl(30) / 4xl(36) / 5xl(48) / 6xl(60) / 7xl(72)`

### 2.4 Spacing & layout
- 8px base unit, container max-width `1280px` (`1440px` for feature-heavy sections)
- Section vertical rhythm: `py-24` desktop / `py-16` mobile
- Border radius: `rounded-xl` (12px) cards, `rounded-full` pills/badges, `rounded-2xl` (16px) hero media frames

### 2.5 Core components (shadcn/ui base + custom)
`Button` (primary/secondary/ghost/destructive — primary variant follows the §2.2 contrast rule), `Badge` (status pill: New/Qualified/Booked/Rejected — tinted-background pattern per §2.2, color-mapped), `Card`, `Tabs`, `Accordion` (FAQ), `Dialog`, `Sheet` (mobile nav + lead detail drawer), `Table` (leads table with sticky header), `Avatar`, `Toast`, `Tooltip`, `Skeleton`, `Progress`, `Chart` (Recharts wrapper for dashboard KPIs), `LiveTranscript` (custom — animated chat-bubble replay of an AI qualification conversation, used on marketing home AND real in dashboard), `StatusDot` (pulsing dot for "AI is replying now" real-time indicator), `EmptyState` (custom — shared empty/zero-data illustration + message + CTA, used anywhere a table/list/chart can legitimately have no data yet: brand-new org, 0 leads, 0 integrations connected — see §3.8).

**Icon set:** `lucide-react` exclusively — shadcn/ui's default, keeps icon weight/style consistent across every component without a second icon library.

**Forms:** every form on the site (signup, login, contact, demo lead-capture, agent config, onboarding steps) uses `react-hook-form` with `@hookform/resolvers/zod`, validating against the same Zod schemas defined in §4.2 — one validation source of truth from client form to (eventual) API boundary.

### 2.6 Motion
Framer Motion, restrained: fade+slide-up on scroll-into-view (`viewport={{ once: true }}`), 150–250ms micro-interactions only. No parallax gimmicks — this is a B2B trust product, not a consumer app. All motion must degrade gracefully — see §2.7.

### 2.7 Accessibility foundations (WCAG 2.1 AA — applies site-wide)
These four rules are foundational, not page-specific, and apply everywhere §2's components are used:
- **Reduced motion:** every Framer Motion animation checks `useReducedMotion()` (or an equivalent media-query guard) and swaps to an instant/opacity-only transition when `prefers-reduced-motion: reduce` is set — this includes the `LiveTranscript` typewriter effect and the `/demo` widget's simulated streaming (§8 Phase 3).
- **Focus visibility:** one consistent focus style site-wide — `focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2` (or `ring-signal-500` on dark `ink-950` backgrounds, adjusted offset color) — applied via a shared Tailwind utility, not re-declared per component.
- **Skip link:** a visually-hidden-until-focused "Skip to content" link as the first focusable element in the root layout, targeting `<main id="main-content">`.
- **Contrast:** the §2.2 contrast rule is the concrete mechanism that satisfies the ≥4.5:1 requirement referenced in §5.6 — don't treat §5.6 as a vague aspiration, §2.2 is how it's actually met.

---

## 3. Site Map & Page-by-Page Spec

### 3.1 Marketing site (public, SSR/SSG via Next.js App Router)

```
/                          Home
/how-it-works              Deep-dive on the 4-step agent flow
/product                   Feature grid (agent capabilities)
/product/qualification     Sub-page: qualification logic explained
/product/integrations      Integrations marketplace
/solutions/[industry]      Programmatic SEO pages (agencies, real-estate, SaaS, ecommerce...)
/pricing                   Pricing tiers + calculator
/customers                 Case studies index
/customers/[slug]          Individual case study
/blog                      SEO/AEO content hub
/blog/[slug]                Article page
/compare/[competitor]      Programmatic "LeadPilot vs X" pages (SEO capture on competitor-name searches)
/faq                       Full FAQ (AEO hub page)
/about
/contact
/security                  Trust/compliance page (SOC2 roadmap, data handling)
/legal/privacy
/legal/terms
/login
/signup
/demo                      Interactive sandbox — submit a fake lead, watch AI respond live (mirrors 1-pager's "easy to demo" MVP goal)
```

### 3.2 Home page (`/`) — section-by-section build spec

1. **Nav bar** — sticky, transparent-over-hero → solid on scroll. Logo, Product / Solutions / Pricing / Customers / Blog dropdowns, "Login", primary CTA "Get a Demo Lead" (button triggers the same live widget used on `/demo` — this is the conversion trick borrowed from Artisan's "watch Ava work" pattern).
2. **Hero**
   - H1 (AEO-optimized to directly answer "what is an AI SDR"): *"Your AI SDR replies to every lead in under 10 seconds — qualifies them, books the call, never sleeps."*
   - Sub-headline: 1-sentence expansion citing the concrete pain point (6–24hr human response time → lost deals).
   - Primary CTA: "Watch LeadPilot Qualify a Lead Live" (opens embedded live demo, not a form-gated video — matches Artisan/11x pattern of *show don't tell*).
   - Secondary CTA: "Book a Call"
   - Right side: `LiveTranscript` component auto-playing a real qualification conversation (lead message → AI reply → qualifying question → decision → Calendly link sent), looping.
3. **Logo/trust bar** — "Built on the same stack as [X]" or "Trusted by teams using…" (placeholder logos until real customers exist; swap for integration logos — OpenAI, Groq, Slack, HubSpot, Calendly — as a credibility proxy pre-launch). **Honesty constraint:** frame this strictly as "works with" / "built on," never implied partnership or endorsement, until real integration agreements exist — see the global honesty policy in §3.8.
4. **Problem/Agitation section** — 3-column stat cards pulled straight from the 1-pager: "6–24hr average response time," "$3–5k/mo cost of a human SDR," "80% of leads go cold after 5 minutes" (cite real source or mark as illustrative — see SEO section on E-E-A-T).
5. **How It Works** — 4 numbered steps as horizontal timeline (desktop) / vertical stack (mobile), matching 1-pager flow exactly:
   1. Lead comes in (website form / WhatsApp / email)
   2. AI replies instantly
   3. AI asks qualifying questions (budget/timeline/need)
   4. AI decides → Calendly + Slack/email alert to sales team, or politely closes
   Each step has a small animated illustration + one-line caption. Structured as an `HowTo` schema-eligible block (see SEO section).
6. **Interactive Demo Widget** (`/demo` embedded via iframe-free React component) — form: "Submit a fake lead" → real API call to a sandbox agent → live streamed AI response in a chat UI. This is the single highest-converting section per competitor pattern (Artisan, 11x both lead with "watch the agent work"). **Until the backend exists**, this "live" behavior is a client-side simulated stream over a scripted fixture conversation (§4.2, §8 Phase 3) — functionally identical to the user, explicitly disclosed as a simulation on `/demo` itself, and built so the real API call is a drop-in swap later.
7. **Feature grid** (bento-style, 6 cards): Instant Reply Engine (Groq), Qualification Logic (OpenAI Agents SDK), Guardrails & Handoff, Multi-channel intake (form/WhatsApp/email), Live Dashboard, Notifications.
8. **Dashboard preview** — renders the **real, shared** `KpiCard` and `LeadsTablePreview` components (the same ones used in the authenticated dashboard, pulled forward in §8 Phase 1) inside a non-interactive framed container with annotated callouts (New/Qualified/Booked/Rejected counters). Deliberately **not** a static screenshot/mock image — a real component render can never drift out of sync with the actual product, which a screenshot inevitably does.
9. **Integrations strip** — logo grid, links to `/product/integrations`.
10. **Social proof** — testimonial cards (rotating carousel) + one hero case-study stat callout. **Honesty constraint:** every testimonial/case-study fixture carries an `isIllustrative` flag (§4.2); while `true`, the UI must visibly label the card "Illustrative example" — never presented as a real customer quote until it is one.
11. **Pricing teaser** — 3-tier cards, "See full pricing" CTA to `/pricing`.
12. **FAQ accordion** (5–7 top questions, AEO-formatted — see Section 5).
13. **Final CTA band** — full-width dark section, single strong CTA.
14. **Footer** — sitemap-complete link columns (Product, Solutions, Resources, Company, Legal), social icons, newsletter signup (SEO/content distribution asset), llms.txt + sitemap.xml linked in fine print for transparency (optional but matches Anthropic/Stripe practice referenced in SEO section).

### 3.3 `/pricing`
3–4 tiers (Starter / Growth / Scale / Enterprise-custom), monthly/annual toggle, feature comparison table, embedded FAQ specific to billing, `Product` + `Offer` schema markup per tier.

### 3.4 `/solutions/[industry]` (programmatic SEO)
Templated page generated from a CMS/DB table (`industries`) — headline swaps industry name, 3 pain points specific to that vertical, 1 relevant case study, same CTA stack as home. This is the primary long-tail SEO growth lever (mirrors how Regie.ai runs persona/vertical pages). Until the real CMS/DB exists, sourced from the typed `industries` fixture (§4.2) via `getIndustries()`/`getIndustryBySlug()` — same shape, same `generateStaticParams` usage, zero component changes needed when the real backend lands.

### 3.5 `/compare/[competitor]` (programmatic SEO)
Templated comparison page (LeadPilot vs Lindy / vs Artisan / vs 11x / vs Regie / vs Alignment) — honest feature-comparison table, no disparagement, targets "[competitor] alternative" search queries. Content pulled from a `comparisons` DB table so it's editable without redeploy — for now, the typed `comparisons` fixture (§4.2) via `getComparisons()`/`getComparisonBySlug()`.

### 3.6 `/blog` + `/blog/[slug]`
Headless-CMS-driven (see backend spec) content hub. Each article: H1 matching search intent, TL;DR answer box in first 100 words (AEO), table of contents, author byline with credentials (E-E-A-T), related-articles module, embedded FAQ block with `FAQPage` schema where relevant, last-updated date visible. Article bodies live as MDX under `/content/blog/*.mdx`, referenced by path from the `blog-posts` fixture metadata (§4.2) until a real headless CMS is wired in.

### 3.7 App / product pages (authenticated, `/dashboard/*`)

```
/dashboard                     Overview: KPI cards (leads today, qualified, booked, response time avg)
/dashboard/leads               Leads table — filter by status, channel, date; search
/dashboard/leads/[id]          Lead detail drawer/page — full conversation transcript, qualification answers, status control, manual override/handoff button
/dashboard/agent               Agent configuration — qualifying questions, guardrail rules, tone/persona, Calendly link, handoff threshold
/dashboard/integrations        Connect WhatsApp Business API, email inbox, website form embed snippet, Calendly, Slack
/dashboard/notifications       Notification rules (email/Slack triggers)
/dashboard/team                Invite teammates, roles (Owner/Admin/Sales Rep)
/dashboard/billing             Plan, usage (leads processed this cycle), invoices, upgrade
/dashboard/settings            Org profile, branding, danger zone
```

**Leads table** — status badge colors map 1:1 to the canonical status map in §2.2: New=amber, Qualified=signal-green, Booked=blue, Rejected=red. Row click → slide-over `Sheet` with full transcript rendered via `LiveTranscript` component (same component used in marketing hero — code reuse, and reinforces brand consistency between marketing promise and product reality).

**Onboarding flow** (`/onboarding` — post-signup, pre-dashboard): 4-step wizard — (1) connect a lead channel, (2) define qualifying questions, (3) connect Calendly + notification target, (4) send a test lead through the live widget to confirm it works before going live. This operationalizes the 1-pager's "easy to demo" principle as the actual activation flow. **Progress persists server-side (in the session, not just component state)** — a refresh or back-button mid-wizard must resume where the user left off, not silently restart activation (see §4.6 for how this is stored pre-backend).

**Zero-data state:** a brand-new org has 0 leads and 0 connected integrations by design — `/dashboard`, `/dashboard/leads`, and `/dashboard/integrations` must render the shared `EmptyState` component (§2.5, §3.8) in that case, not an awkward blank table or a `0`/`NaN` KPI card.

### 3.8 Page-level conventions & shared states (applies across all routes)

- **Standard Next.js App Router files, per route group where relevant:** `not-found.tsx` (site-wide + one for each dynamic-slug route: `/blog/[slug]`, `/solutions/[industry]`, `/compare/[competitor]`, `/customers/[slug]`), `error.tsx` (recoverable render errors, per route group), `global-error.tsx` (root-level fallback), `loading.tsx` (route-level Suspense fallback using `Skeleton`). None of these existed as a concept in earlier drafts of this spec — they're required, not optional polish.
- **Empty states:** any list/table/chart that can legitimately have zero data (see §3.7) renders the shared `EmptyState` component — icon, one-line explanation, and a CTA that resolves the emptiness (e.g. "Connect your first lead channel").
- **Global honesty policy (binding on every page, not just `/customers/[slug]`):** never fabricate testimonials, customer logos implying partnership, review ratings, or compliance certifications that don't yet exist. Where real proof doesn't exist yet, either omit the section or clearly label it illustrative/in-progress (e.g. `/security` states "SOC 2 in progress" rather than implying a completed audit). This extends the spec's original "never fabricate ratings" principle (§5.2) to testimonials (§3.2.10), trust-bar logos (§3.2.3), and `/security` claims.
- **Cookie consent:** a lightweight, dismissible consent banner (`CookieConsentBanner`, `components/shared/`) gates analytics initialization (§6) — required because GA4/PostHog are already planned and EU/UK visitors are in scope for a self-serve SaaS product.
- **Brand/favicon assets:** `app/icon.tsx` (favicon, generated via `next/og`-style ImageResponse or a static SVG), a default `app/opengraph-image.tsx` fallback for routes without a dynamic OG image, and `public/site.webmanifest` for basic installability metadata.

---

## 4. Frontend Architecture

```
/app
  /(marketing)
    layout.tsx            -- marketing nav/footer, generates static metadata per route
    page.tsx               -- Home
    how-it-works/page.tsx
    product/page.tsx
    product/integrations/page.tsx
    solutions/[industry]/page.tsx   -- generateStaticParams from industries fixture (§4.2), DB later
    pricing/page.tsx
    customers/page.tsx
    customers/[slug]/page.tsx
    blog/page.tsx
    blog/[slug]/page.tsx
    compare/[competitor]/page.tsx
    faq/page.tsx
    about/page.tsx
    contact/page.tsx
    security/page.tsx
    legal/privacy/page.tsx
    legal/terms/page.tsx
    demo/page.tsx
    not-found.tsx / error.tsx / loading.tsx
  /(auth)
    login/page.tsx
    signup/page.tsx
    onboarding/page.tsx
  /(app)
    layout.tsx             -- authenticated shell, sidebar nav, session guard
    dashboard/page.tsx
    dashboard/leads/page.tsx
    dashboard/leads/[id]/page.tsx
    dashboard/agent/page.tsx
    dashboard/integrations/page.tsx
    dashboard/notifications/page.tsx
    dashboard/team/page.tsx
    dashboard/billing/page.tsx
    dashboard/settings/page.tsx
    loading.tsx / error.tsx per subroute
  /api                     -- Next.js route handlers for BFF concerns (session cookie relay/mock, webhook proxy, SSE endpoint); all business logic moves to the FastAPI backend once it exists (§4.6)
  sitemap.ts                -- dynamic sitemap.xml generator (App Router native)
  robots.ts                 -- dynamic robots.txt
  llms.txt/route.ts          -- see SEO section 5.4
  icon.tsx / opengraph-image.tsx / global-error.tsx
/components
  /marketing (Hero, ProblemStats, HowItWorks, LiveDemoWidget, FeatureGrid, PricingCards, Testimonials, FAQAccordion, CTASection)
  /dashboard (KpiCard, LeadsTable, LeadsTablePreview, LeadDetailSheet, StatusBadge, AgentConfigForm, IntegrationCard)
  /shared (LiveTranscript, StatusDot, EmptyState, Nav, Footer, SkipToContent, CookieConsentBanner, SEO/JsonLd)
  /providers (QueryProvider, AnalyticsProvider)
/lib
  api-client.ts             -- typed fetch wrapper, attaches session cookie, Zod-validates responses (dormant until §4.6's swap)
  schema/                   -- directory, not a single file — one file per domain, barrel-exported via schema/index.ts (see §4.2)
  data/                     -- the fixture/API seam — see §4.3
  fixtures/                 -- typed fixture data, parsed through schema/ at module scope (see §4.2)
  seo.ts                     -- metadata builder helpers, JSON-LD builder helpers
  utils.ts                   -- cn() and other small shared helpers
/content                    -- MDX fallback for blog (see §3.6)
/hooks                       -- React Query hooks wrapping lib/data/* (use-leads.ts, use-kpi.ts, use-agent-config.ts, ...)
/tests
  e2e/                       -- Playwright specs
  unit/                      -- Vitest specs, incl. fixtures-validate.test.ts (§4.5)
```

**State/data:** React Query for all server state (leads, KPIs, agent config); no client-global-store needed beyond session/user context. Real-time lead updates via **Server-Sent Events** (`/dashboard` subscribes to an SSE endpoint for live "new lead came in" toasts — matches the 1-pager's "everything shows up on a dashboard" requirement without overbuilding WebSockets for v1). The SSE endpoint (`app/api/leads/stream/route.ts`) is a genuinely working `ReadableStream` emitting fixture events on an interval — not a client-side `setInterval` fake — so the real-time UX is honestly tested end-to-end even before a backend exists.

**Auth:** Session-cookie based (`httpOnly`, `Secure`, `SameSite=Lax`), consistent with JBD project pattern already used (same `session_id` cookie naming, for continuity — but see §4.6: JBD's own implementation is prototype-grade and its security shortcuts must not be copied). Middleware (`middleware.ts`) protects `/dashboard/*` and `/onboarding`, redirects unauthenticated users to `/login?next=`.

### 4.1 Why this section changed
Earlier drafts of this spec named `lib/api-client.ts` and `lib/schema.ts` as if a real FastAPI backend were already reachable. It isn't — `SKILL-BACKEND.md` doesn't exist yet, confirmed against every related project on this machine. §4.2–§4.6 below define exactly how the frontend is fully, honestly buildable today without one, and exactly what changes (and what doesn't) once the real backend ships.

### 4.2 Data contracts: `lib/schema/` + `lib/fixtures/`

One Zod schema file per domain under `lib/schema/`, barrel-exported from `lib/schema/index.ts` so call sites keep a single `import { LeadSchema } from "@/lib/schema"`:

- **`lead.ts`** — `ChannelSchema` (`website_form|whatsapp|email`), `LeadStatusSchema` (`new|qualified|booked|rejected` — matches §2.2's canonical map), `TranscriptMessageSchema` (`id, role: lead|agent|system, text, timestamp, typingDurationMs?`), `QualificationSchema` (`budget, timeline, need, companySize, decisionAuthority, answers[], score`), `LeadSchema` (`id, name, company, email, phone, channel, status, createdAt, respondedAt, responseTimeSeconds, transcript, qualification, calendlyBookingUrl, bookedAt, rejectionReason, isLive`), `LeadListItemSchema` (Lead minus transcript/qualification detail, plus `qualificationScore`).
- **`demo.ts`** — `DemoScriptStepSchema` (`id, role, text, delayMs`) and `DemoScriptSchema` (`id, label, industry?, steps[], outcome: LeadStatusSchema`) — intentionally separate from `Lead`, drives both the hero loop and `/demo`, always scripted, never fetched.
- **`kpi.ts`** — `KpiSummarySchema` (`leadsToday, leadsTodayDelta, qualifiedToday, qualifiedRate, bookedToday, avgResponseTimeSeconds, avgResponseTimeDelta`), `KpiTimeseriesPointSchema` (`date, newLeads, qualified, booked, rejected, avgResponseTimeSeconds`), `DashboardOverviewSchema` (`summary, timeseries[], recentLeads[]`), `SseEventSchema` — discriminated union of `new_lead | status_change | heartbeat`.
- **`agent-config.ts`** — `QualifyingQuestionSchema` (`id, field, prompt, required`), `AgentConfigSchema` (`persona, qualifyingQuestions[1..8], handoffThreshold, calendlyUrl, guardrails[], active`).
- **`industry.ts`** — `slug, name, metaTitle(≤60), metaDescription(≤155), heroHeadline, heroSubhead, painPoints[≥3], caseStudySlug, faqs[≥3], relevantChannels[], publishedAt, updatedAt`.
- **`comparison.ts`** — `slug, competitorName, metaTitle, metaDescription, intro, featureRows[≥5] (feature, leadPilot, competitor, note?), whenToChooseLeadPilot[], whenToChooseCompetitor[]` (the honesty requirement from §3.5 made structural, not just a style note), `faqs[], updatedAt`.
- **`blog.ts`** — `AuthorSchema (id, name, title, avatarSrc, bio)`, `BlogPostSchema (slug, title, metaTitle, metaDescription, tldr, bodyMdxPath, author, publishedAt, updatedAt, tags[], coverImageSrc, readingTimeMinutes, faqs?, relatedSlugs[≤3])`.
- **`pricing.ts`** — `PricingTierSchema (id, name, tagline, monthlyPriceCents, annualPriceCents, leadsIncludedPerMonth, featureBullets[], highlighted, ctaLabel, ctaHref)`, `PricingComparisonRowSchema (feature, values: Record<tierId, bool|string>)`.
- **`testimonial.ts`** — `TestimonialSchema (id, quote, authorName, authorTitle, companyName, companyLogoSrc, avatarSrc, metricCallout, isIllustrative)` — `isIllustrative` is mechanical, not decorative: components must branch on it to render the "Illustrative example" label from §3.8's honesty policy, not just trust content authors to remember. `CaseStudySchema (slug, companyName, industry, summary, metrics[], narrative, quote?, isIllustrative, publishedAt)`.
- **`integration.ts` / `team.ts` / `billing.ts` / `auth.ts`** — `IntegrationSchema (id, provider: whatsapp|email|website_form|calendly|slack|hubspot, label, description, logoSrc, status: connected|not_connected|error, connectedAt, configHref)`; `TeamMemberSchema (id, name, email, role: owner|admin|sales_rep, avatarSrc, invitedAt, status: active|invited)`; `InvoiceSchema (id, date, amountCents, status: paid|open|void, pdfUrl)` + `BillingSchema (planId, planName, leadsProcessedThisCycle, leadsIncluded, cycleEndsAt, invoices[])`; `LoginInputSchema`, `SignupInputSchema`, `SessionUserSchema (id, orgId, name, email, role, onboardingCompletedAt)`.

`lib/fixtures/*.ts` mirrors this list one file per domain (`leads.ts`, `demo-scripts.ts`, `kpi.ts`, `agent-config.ts`, `integrations.ts`, `team.ts`, `billing.ts`, `industries.ts`, `comparisons.ts`, `blog-posts.ts`, `pricing.ts`, `testimonials.ts`, `faqs.ts`). Each file parses its own literal data through `Schema.array().parse(...)` at module scope, so a fixture that drifts from its schema fails the build immediately rather than surfacing as a silent runtime bug. KPI timeseries data must be a precomputed literal array, not generated with `Math.random()`/`Date.now()` at import time — otherwise SSR/CSR hydration mismatches on every page load.

### 4.3 The seam: `lib/data/`

`lib/data/*.ts` (one file per domain: `leads.ts`, `kpi.ts`, `industries.ts`, `comparisons.ts`, `blog.ts`, `pricing.ts`, `testimonials.ts`, `team.ts`, `billing.ts`, `integrations.ts`, `agent-config.ts`, `auth.ts`) exposes typed functions — `getLeads(filters)`, `getLeadById(id)`, `updateLeadStatus(id, status)`, `getDashboardOverview()`, `getIndustries()`, `getIndustryBySlug(slug)`, and so on. Today, every function reads from `lib/fixtures/*`; tomorrow, the same function signature calls `apiFetch()` against the real backend. **The rule that makes this real rather than aspirational: components and pages import only from `lib/data/*`, never from `lib/fixtures/*` or `lib/api-client.ts` directly.** This is the single concrete answer to "how does the frontend not depend on a backend that doesn't exist" — without this seam named explicitly, engineers will import fixtures straight into components and the future swap silently breaks.

### 4.4 Mutations without a database

Dashboard actions that mutate state (lead status change, agent-config edits, integration connect/disconnect) can't hit a real database yet, and in-memory server state won't survive a stateless/multi-instance serverless deployment. Instead: a small **signed cookie overlay** (`lp_overlay`, a JSON diff merged over the base fixture on every read) written by the relevant `app/api/*` Route Handler. Scoped per-browser-session, resets on cookie clear. This is explicitly commented in code as backend-migration debt, not a persistence strategy to keep.

### 4.5 Tooling & testing (previously unspecified)

- **Lint/format:** ESLint (`next/core-web-vitals` + `typescript-eslint`), Prettier + `prettier-plugin-tailwindcss` (deterministic class ordering).
- **Unit/component tests:** Vitest + `@testing-library/react`. Minimum required suite: `LiveTranscript.test.tsx`, `StatusBadge.test.tsx` (contrast/status-mapping correctness), and **`fixtures-validate.test.ts`** — asserts every fixture file parses against its schema; this is the actual safety net behind the fixture-first bet in §4.2–§4.3.
- **E2E tests:** Playwright, minimum required suite: home page load, `/demo` widget interaction, full signup → onboarding → dashboard flow, leads-table filter/search.
- **CI:** a minimal workflow running lint, typecheck, unit tests, e2e smoke tests, and build on every PR.

### 4.6 Backend-status disclaimers (read before treating anything below as production-ready)

- Session auth (`app/api/auth/*`) is a **mock**: any well-formed signup/login succeeds and sets the real `httpOnly`/`Secure`/`SameSite=Lax` cookie mechanics, but there is no real credential store behind it yet.
- The cookie-overlay mutation pattern (§4.4) is a **temporary stand-in for a database**, not a pattern to carry into production.
- The JBD sibling project's auth code is a naming/pattern reference only (cookie name, general shape) — its security posture (hardcoded `secure=False`, a demo-mode verification bypass) must **not** be copied.
- None of the above blocks building a genuinely complete, professional frontend today — it just means "wire up the real backend" is a scoped, well-defined future task instead of a rewrite.

### 4.7 Environment variables (`.env.local`)
```
NEXT_PUBLIC_API_BASE_URL        # placeholder until the real backend exists; unused while lib/data/* reads fixtures
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_GA4_MEASUREMENT_ID
NEXT_PUBLIC_SITE_URL            # canonical URL base for metadata/sitemap/OG
COOKIE_DOMAIN
SESSION_COOKIE_SECRET           # signs the lp_overlay cookie (§4.4)
```

---

## 5. SEO / AEO / GEO Implementation (frontend responsibilities)

Grounded in 2026 guidance: Google's May 2026 "Optimizing for generative AI features" documentation confirms AEO/GEO for **Google's own AI Overviews and AI Mode are governed by the same core ranking/quality systems as normal Search** — llms.txt, content-chunking, and AI-specific rewriting are explicitly *not* required for Google. However, third-party LLM answer engines (ChatGPT browsing, Perplexity, Claude) still rely on crawlability, structured data, and citation-worthy content, and industry data shows most AI-answer citations come from third-party mentions rather than the brand's own site — so the strategy below optimizes for **both** Google's real requirements and the broader LLM-citation ecosystem, without chasing debunked tactics as if they were guaranteed wins.

### 5.1 Technical foundation (non-negotiable, do first)
- **SSR/SSG everywhere on marketing routes** — Next.js App Router with `generateStaticParams` for `/solutions/[industry]`, `/compare/[competitor]`, `/blog/[slug]`. No client-only rendering of primary content; many AI crawlers cannot execute JavaScript.
- Core Web Vitals budget: LCP < 2.0s, CLS < 0.05, INP < 150ms. Enforce via `next/image`, font subsetting (`next/font`), route-level code splitting, no render-blocking third-party scripts above the fold.
- Clean semantic HTML: one `<h1>` per page, logical `<h2>/<h3>` hierarchy, `<nav>`, `<main>`, `<article>`, `<section>` landmarks — this is the single highest-leverage "AI readability" factor per 2026 guidance (accessible HTML ≈ LLM-legible HTML).
- `robots.txt` (via `app/robots.ts`) explicitly allows known AI crawlers (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `CCBot`) unless there's a business reason to block them — visibility in AI answers requires being crawlable by them.

### 5.2 Metadata & structured data (per page)
- Next.js `generateMetadata()` on every route: unique `title` (≤60 chars), `description` (≤155 chars, written as a direct answer to the page's core query), canonical URL, Open Graph + Twitter card images (auto-generated via `next/og` for blog/compare/solutions pages so every shared link has a branded image; falls back to the default `app/opengraph-image.tsx` from §3.8 where no dynamic image applies).
- JSON-LD via a shared `<JsonLd>` component, injected per page type:
  - `Organization` + `SoftwareApplication` schema (site-wide, in root layout)
  - `Product` / `Offer` schema on `/pricing`
  - `FAQPage` schema on `/faq` and any page with an FAQ accordion
  - `HowTo` schema on `/how-it-works`
  - `Article` schema on every `/blog/[slug]`
  - `BreadcrumbList` schema on all deep pages (`/solutions/*`, `/compare/*`, `/blog/*`)
  - `Review`/`AggregateRating` schema on `/customers/[slug]` once real ratings exist (never fabricate ratings — schema spec and Google policy both prohibit fake review markup; this is the same global honesty policy defined in §3.8, applied to structured data specifically)

### 5.3 AEO content pattern (Answer Engine Optimization)
Every page that targets a question-style query follows this structure:
1. **Direct answer in the first 40–60 words** under the H1 — no throat-clearing intro paragraph.
2. Supporting detail in scannable sections with descriptive `<h2>` questions (e.g., "How fast does LeadPilot respond to a new lead?").
3. FAQ block at the end using real, distinct questions (not keyword-stuffed near-duplicates) — mapped to `FAQPage` schema.
4. Definitive claims backed by a stat, a demo, or a named mechanism (e.g., "replies in under 10 seconds using Groq's low-latency inference") rather than vague marketing language — specificity is what gets quoted by answer engines.

### 5.4 GEO / LLM-citation strategy
- Publish `llms.txt` at the root (`app/llms.txt/route.ts`) — a curated plain-text index of the most important pages with one-line descriptions. Per 2026 evidence this is **not a ranking factor for Google** but is an emerging, low-cost signal several major LLM/agent crawlers do consume — implement it, but don't oversell its impact internally.
- Maintain **entity consistency**: the name "LeadPilot AI," its category ("AI SDR" / "AI Sales Qualification Agent"), and its core claim (instant reply + qualification + booking) must be worded identically across the site, the blog, social profiles, and any directory/review-site listings (G2, Capterra, Product Hunt) — consistent entity naming is repeatedly cited as a top GEO factor because LLMs synthesize answers from many surfaces, not just the owned site.
- Actively seed **third-party citations**: since ~85% of AI-answer brand mentions originate off-site, the content strategy must include Product Hunt launch, G2/Capterra profile with real reviews, guest posts, and founder interviews — this is a marketing workstream, not a frontend build task, but the site must support it via `/press` assets and a clean `/security` + `/about` page that off-site writers can cite accurately.
- No content chunking gimmicks, no AI-only rewritten pages, no schema stuffing beyond what's factually true — Google's 2026 guidance explicitly flags over-engineering these as wasted effort or even a quality-signal risk.

### 5.5 Programmatic SEO governance
`/solutions/[industry]` and `/compare/[competitor]` pages must each have **genuinely differentiated content** (unique pain points, unique case study, unique FAQ) — thin templated pages with only the noun swapped are a well-documented spam pattern that both traditional SEO and AI answer engines penalize. The `industries`/`comparisons` fixtures (§4.2) enforce a minimum-uniqueness content block per generated page today; the eventual backend content model (Section 6 of `SKILL-BACKEND.md`, once it exists) takes over the same enforcement.

### 5.6 Accessibility = SEO/AEO multiplier
WCAG 2.1 AA minimum: color contrast ≥4.5:1 (the §2.2 contrast rule is what actually satisfies this for the ink/signal-green/amber/blue/red palette), all interactive elements keyboard-navigable, all images have descriptive `alt` text (also directly feeds AI-image-understanding and GEO), form inputs properly labeled (enforced structurally by the react-hook-form + Zod pattern in §2.5). 2026 data shows accessible sites see meaningfully higher organic traffic — accessibility and machine-readability are the same underlying work.

---

## 6. Analytics & Experimentation
- **PostHog or GA4 + Vercel Analytics** for product + marketing funnels. Both gated behind the `CookieConsentBanner` (§3.8) — no analytics script initializes before consent is granted.
- Track funnel: landing → live-demo interaction → signup → onboarding-complete → first-real-lead-processed (activation event) → paid conversion.
- A/B testing framework (PostHog feature flags) reserved for hero headline and pricing-page layout only in v1 — don't over-engineer experimentation before there's traffic.

## 7. Non-goals for v1 frontend
No native mobile app, no multi-language i18n (English only for MVP), no white-label/reseller portal UI yet (mentioned as a future opportunity in the 1-pager, not MVP scope), no in-app live chat support widget beyond a simple mailto/Calendly link, no real backend integration in this phase — the frontend runs fully against the typed fixture layer in §4.2–§4.3 until `SKILL-BACKEND.md`'s FastAPI service is built, at which point only `lib/data/*` changes.

---

## 8. Phased Implementation Roadmap

A concrete build sequence for whenever implementation begins, ordered so the highest-scrutiny, highest-converting surfaces (design system, Home, `/demo`) land first and later phases extend established patterns rather than inventing new ones.

- **Phase 0 — Scaffold, tooling, tokens.** `package.json` (full stack from the header, plus `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`, `date-fns`), `tsconfig.json` (strict, `@/*` paths), `tailwind.config.ts` (full §2.2 token set incl. `blue-500/700`), `app/globals.css` (focus-visible ring, reduced-motion overrides), ESLint/Prettier config, `.env.local.example`, `components.json` + themed shadcn primitives, root `layout.tsx` (fonts, `QueryProvider`, skip link, site-wide JSON-LD), `robots.ts`/`sitemap.ts`/`llms.txt`/`icon.tsx`/`opengraph-image.tsx`/`site.webmanifest`, `not-found.tsx`/`error.tsx`/`global-error.tsx`/`loading.tsx`, `middleware.ts` skeleton, `lib/utils.ts`. **Done when:** blank shell renders with correct fonts/tokens, lint/format clean, one trivial Playwright test passes.
- **Phase 1 — Data layer + design system + shared components.** All of `lib/schema/*`, `lib/fixtures/*`, `lib/data/*`, `lib/api-client.ts` (dormant), `lib/seo.ts`; `components/shared/{JsonLd,StatusBadge,StatusDot,LiveTranscript,EmptyState,FadeIn,Nav,MobileNav,Footer,SkipToContent,CookieConsentBanner}`; `components/providers/{QueryProvider,AnalyticsProvider}`; and — pulled forward specifically so Home's dashboard preview (§3.2.8) never goes stale — `components/dashboard/{KpiCard,LeadsTablePreview}`. **Done when:** every shadcn primitive is re-themed (not default zinc), `StatusBadge` passes contrast checks, `LiveTranscript` plays a fixture script standalone, `KpiCard`/`LeadsTablePreview` render fixture data with no auth dependency.
- **Phase 2 — Home page.** `app/(marketing)/layout.tsx`, `app/(marketing)/page.tsx`, `components/marketing/{HeroSection,TrustBar,ProblemStats,HowItWorksTimeline,FeatureBentoGrid,DashboardPreview,IntegrationsStrip,SocialProofCarousel,PricingTeaser,FAQAccordion,FinalCtaBand}`. Section 6 (interactive demo) ships as a stub CTA card linking to `/demo` — filled in Phase 3. **Done when:** all 14 §3.2 sections are real (no lorem ipsum), LCP<2s, reduced-motion fallback verified, mobile nav via `Sheet`, zero critical axe violations.
- **Phase 3 — `/demo` widget.** `components/marketing/demo/{LiveDemoWidget,DemoLeadForm,useSimulatedStream}` (react-hook-form+zod input → matched against `demo-scripts` fixture → progressive reveal via `delayMs`, fully client-side, zero network calls, explicit "this is a scripted simulation" disclosure per §3.2.6); swap Home's Phase-2 stub for the real embedded widget. **Done when:** works fully offline, keyboard-operable, instant-reveal under reduced motion, Playwright + unit test coverage.
- **Phase 4 — Remaining marketing routes.** `how-it-works`, `product` (+`/qualification`, `/integrations`), `solutions/[industry]`, `pricing`, `customers` (+`[slug]`), `blog` (+`[slug]`), `compare/[competitor]`, `faq`, `about`, `contact` (+`app/api/contact/route.ts`), `security`, `legal/privacy`, `legal/terms`, plus `not-found.tsx` per dynamic-slug route. **Done when:** every route has `generateMetadata` + correct JSON-LD (§5.2), zero dead links, `sitemap.ts` covers every static+dynamic path, programmatic pages have genuinely distinct content (§5.5).
- **Phase 5 — Auth + onboarding.** `app/(auth)/{layout,login,signup,onboarding}`, `components/auth/{LoginForm,SignupForm,onboarding/{OnboardingWizard,Step1..4}}` (Step 4 reuses `LiveDemoWidget` to "send a test lead"), `lib/data/auth.ts` + `lib/schema/auth.ts`, `app/api/auth/{login,signup,logout,session}/route.ts` (mock per §4.6, real cookie mechanics), fully wired `middleware.ts`. Onboarding progress persists server-side per §3.7. **Done when:** unauth → `/dashboard` redirects correctly, full mock signup→onboarding→dashboard flow works, forms fully labeled/accessible, e2e coverage.
- **Phase 6 — Dashboard shell + pages.** `app/(app)/layout.tsx` (sidebar, session guard, SSE subscription) + all nine `/dashboard/*` routes and their components (`LeadsTable` extending `LeadsTablePreview`, `LeadDetailView`, `AgentConfigForm`, `IntegrationCard`, `InviteMemberDialog`, `InvoiceTable`, danger-zone `Dialog`), a genuinely working `app/api/leads/stream/route.ts` SSE endpoint + `LiveLeadToaster`, React Query hooks in `/hooks`, `loading.tsx`/`error.tsx` per subroute, `EmptyState` wired into zero-data cases (§3.7). **Done when:** all forms Zod-validated with accessible errors, SSE toast demonstrably fires, mutations persist for the session via the cookie overlay (§4.4), e2e coverage on KPI load / table filter / lead detail / status change.
- **Phase 7 — Hardening.** Dynamic OG images for `blog/[slug]`/`compare/[competitor]`/`solutions/[industry]`, full axe + Lighthouse pass, `lib/analytics.ts` behind consent, the full Playwright + Vitest suite from §4.5, CI workflow, bundle audit (code-split Recharts, `LazyMotion` for Framer Motion), final `llms.txt`/`robots.ts` crawler-allowlist check. **Done when:** Lighthouse ≥95 on sampled routes, zero critical/serious axe violations site-wide, CI green, all JSON-LD validates.

**Scope recommendation for that future build:** go **flagship-slice-first**, not uniform-depth. Fully bespoke: Phases 0–3 (design system, Home, `/demo`), plus `/pricing` and the three dashboard views most likely to be demoed (`/dashboard`, `/dashboard/leads`, `/dashboard/leads/[id]`). Every other route gets real metadata, real fixture-backed copy, and zero dead links or placeholder text — built from the shared `Card`/`Table`/`Section` primitives with standard layouts rather than bespoke per-page composition. With ~35 total routes, spreading effort evenly means nothing feels finished for a long stretch, while this spec's own competitive analysis (§1) already identifies Home and the live demo as the highest-converting, most-scrutinized surface — that's where "10/10" has to land first. The failure mode to avoid: "lighter" must mean *simpler visual treatment*, never *incomplete or fake* — a reviewer hitting a broken link or lorem ipsum on `/security` or `/dashboard/team` does more trust damage than a plain-but-fully-real page would.

---

## 9. Gap-Fix Changelog

Summary of what this revision added or corrected, for anyone comparing against an earlier draft of this spec:

- **Fixed an undefined color:** "Booked = blue" was referenced in §3.7 but never defined in §2.2 — added `blue-500`/`blue-700` tokens and made the New/Qualified/Booked/Rejected status map canonical and singular (Rejected is red, not also slate).
- **Fixed a real accessibility bug:** `signal-500`/`amber-500`/`red-500` all fail WCAG AA contrast against white text — added the explicit CTA-button and tinted-badge contrast rules in §2.2.
- **Named the icon set, form library, and testing stack** (`lucide-react`; `react-hook-form` + `@hookform/resolvers/zod`; Playwright + Vitest) — previously unspecified despite being required by other parts of the spec.
- **Added standard Next.js conventions** that were entirely missing: `not-found.tsx`/`error.tsx`/`global-error.tsx`/`loading.tsx`, a shared `EmptyState` component and zero-data-state guidance, favicon/OG-fallback/manifest assets.
- **Added a global honesty policy** extending the original "never fabricate ratings" rule to testimonials, trust-bar logos, and `/security` compliance claims — now stated once in §3.8 and referenced everywhere it applies, instead of only covering `/customers/[slug]`.
- **Added a cookie-consent requirement** gating the already-planned GA4/PostHog analytics.
- **Closed the biggest structural gap:** the spec assumed a FastAPI backend that doesn't exist. Added the fixture-first data layer (§4.2–§4.4) — `lib/schema/`, `lib/fixtures/`, and the `lib/data/` seam — with the explicit rule that components only ever import from `lib/data/*`, so the eventual real-backend swap is a genuine drop-in rather than an aspiration.
- **Added a tooling/testing section (§4.5)** and an environment-variable inventory (§4.7) — both entirely absent before.
- **Added explicit backend-status disclaimers (§4.6)** so mock auth, cookie-overlay mutations, and the JBD-referenced cookie naming aren't mistaken for production-ready security once real implementation starts.
- **Added §8, the phased implementation roadmap**, and this changelog (§9), as permanent parts of the spec rather than one-off planning artifacts.
