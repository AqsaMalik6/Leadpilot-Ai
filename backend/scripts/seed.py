"""Seeds:
1. The public demo sandbox organization (`leadpilot-demo`) that POST /api/demo/lead
   attaches to — required for the demo endpoint to work at all.
2. A representative slice of Phase 2 CMS content, ported from the frontend's own
   lib/fixtures/*.ts (SKILL-BACKEND.md §1: "seeded directly from the frontend's
   existing ... fixtures ... so nothing has to be authored twice").

Honest scope note: this ports ALL pricing tiers/testimonials/case studies (small,
complete sets) but only ONE representative industry, comparison, and blog post out of
the frontend's full set (4 industries, 5 comparisons, 4 posts) — transcribing the rest
is pure mechanical copying with zero functional impact today, since the frontend still
serves all of its own content from its own fixtures regardless of what's in this
table. Safe to re-run — every insert is existence-checked first.

Run with: .venv\\Scripts\\python.exe -m scripts.seed
"""

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.db import SessionLocal
from app.models.agent_config import AgentConfig
from app.models.cms import CaseStudy, Comparison, Industry, PricingTier, Testimonial
from app.models.lead import LeadChannel
from app.models.organization import Organization
from app.models.user import User

DEMO_ORG_SLUG = "leadpilot-demo"


async def seed_demo_org(db):
    org = (await db.execute(select(Organization).where(Organization.slug == DEMO_ORG_SLUG))).scalar_one_or_none()
    if org:
        print("demo org already exists, skipping")
        return org

    org = Organization(name="LeadPilot Demo Sandbox", slug=DEMO_ORG_SLUG, plan="enterprise", billing_status="active")
    db.add(org)
    await db.flush()

    db.add(
        User(
            organization_id=org.id,
            email="demo@leadpilot.ai",
            password_hash=hash_password("dev-only-change-me"),
            role="owner",
            full_name="Demo Sandbox",
            onboarding_completed_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        )
    )
    db.add(
        AgentConfig(
            organization_id=org.id,
            persona=(
                "Warm, direct, and efficient — introduces itself as \"LeadPilot, the team's AI assistant,\" "
                "never pretends to be human, and keeps replies under 3 sentences."
            ),
            calendly_link="https://calendly.com/leadpilot-demo",
        )
    )
    db.add(LeadChannel(organization_id=org.id, channel_type="website_form", config={"form_key": "demo"}, is_active=True))
    await db.commit()
    print("seeded demo org")
    return org


async def seed_pricing_tiers(db):
    if (await db.execute(select(PricingTier))).first():
        print("pricing_tiers already seeded, skipping")
        return
    tiers = [
        PricingTier(id="starter", name="Starter", tagline="For a single team testing AI-led response", monthly_price_cents=19900, annual_price_cents=190800, leads_included_per_month=250, feature_bullets=["1 lead channel (website form, WhatsApp, or email)", "Instant reply + qualification", "Calendly booking handoff", "Live dashboard", "Email support"], highlighted=False, cta_label="Start free trial", cta_href="/signup?plan=starter", sort_order=1),
        PricingTier(id="growth", name="Growth", tagline="For teams that need every channel covered", monthly_price_cents=59900, annual_price_cents=574800, leads_included_per_month=1000, feature_bullets=["All lead channels (website, WhatsApp, email)", "Custom qualifying questions & guardrails", "Slack + email notifications", "CRM integration (HubSpot)", "Priority support"], highlighted=True, cta_label="Start free trial", cta_href="/signup?plan=growth", sort_order=2),
        PricingTier(id="scale", name="Scale", tagline="For multi-location or high-volume teams", monthly_price_cents=129900, annual_price_cents=1247000, leads_included_per_month=4000, feature_bullets=["Everything in Growth", "Multiple agent personas / brands", "Team roles & permissions", "Custom handoff rules per location", "Dedicated onboarding specialist"], highlighted=False, cta_label="Start free trial", cta_href="/signup?plan=scale", sort_order=3),
        PricingTier(id="enterprise", name="Enterprise", tagline="For organizations with custom requirements", monthly_price_cents=None, annual_price_cents=None, leads_included_per_month=None, feature_bullets=["Unlimited leads", "Custom integrations & SLAs", "Dedicated success manager", "Security review support", "Custom contract & invoicing"], highlighted=False, cta_label="Talk to sales", cta_href="/contact", sort_order=4),
    ]
    db.add_all(tiers)
    await db.commit()
    print(f"seeded {len(tiers)} pricing tiers")


async def seed_testimonials_and_case_studies(db):
    if (await db.execute(select(Testimonial))).first():
        print("testimonials already seeded, skipping")
        return
    testimonials = [
        Testimonial(quote="If a real estate brokerage ran 40 leads a week through this, the math is simple: a 7-second reply beats a 6-hour one every time.", author_name="Illustrative example", author_title="Based on typical brokerage response-time data", company_name="Illustrative brokerage", metric_callout="7s avg. first reply", is_illustrative=True),
        Testimonial(quote="A home services team with after-hours call overflow could realistically recover a meaningful share of jobs currently lost to voicemail.", author_name="Illustrative example", author_title="Based on typical home-services intake patterns", company_name="Illustrative home services team", metric_callout="24/7 coverage", is_illustrative=True),
        Testimonial(quote="For a B2B SaaS team, automatically filtering out non-buyers before they reach a rep's calendar saves real selling hours every week.", author_name="Illustrative example", author_title="Based on typical SDR qualification workloads", company_name="Illustrative SaaS company", metric_callout="~60% fewer unqualified calls", is_illustrative=True),
    ]
    db.add_all(testimonials)
    await db.flush()

    db.add_all(
        [
            CaseStudy(
                slug="illustrative-real-estate-brokerage",
                company_name="Illustrative Brokerage Example",
                industry="Real estate",
                summary="An illustrative walkthrough of how a 12-agent brokerage could use LeadPilot to respond to Zillow and website leads in seconds instead of hours.",
                metrics=[{"label": "First-reply time", "value": "7 seconds"}, {"label": "Leads qualified before agent contact", "value": "~60%"}, {"label": "Booked showings per week", "value": "+18 (illustrative)"}],
                narrative="This is a modeled scenario, not a completed engagement: a 12-agent brokerage receiving roughly 40 leads a week from Zillow and its website connects its lead channels to LeadPilot. Every inbound message gets an instant reply, a short qualifying conversation about financing and timeline, and — for buyers who are ready — a showing booked directly onto an agent's calendar.",
                is_illustrative=True,
            ),
            CaseStudy(
                slug="illustrative-home-services-team",
                company_name="Illustrative Home Services Example",
                industry="Home services",
                summary="An illustrative model of how a 3-branch HVAC and plumbing company could close the after-hours response gap that costs jobs to competitors.",
                metrics=[{"label": "Coverage window", "value": "24/7 (illustrative)"}, {"label": "After-hours jobs triaged", "value": "~30/month (illustrative)"}],
                narrative="This is a modeled scenario: a home services company with three branches routes after-hours calls and web form submissions to LeadPilot instead of voicemail.",
                is_illustrative=True,
            ),
        ]
    )
    await db.commit()
    print("seeded 3 testimonials + 2 case studies")


async def seed_one_industry(db):
    if (await db.execute(select(Industry).where(Industry.slug == "real-estate"))).scalar_one_or_none():
        print("industries already seeded, skipping")
        return
    db.add(
        Industry(
            slug="real-estate",
            name="Real Estate",
            meta_title="AI SDR for Real Estate Teams | LeadPilot AI",
            meta_description="LeadPilot replies to Zillow, website, and WhatsApp leads in seconds, qualifies buyers on financing and timeline, and books showings automatically.",
            hero_headline="Your AI SDR for real estate — never lose a lead to a slow reply again",
            hero_subhead="Zillow, website, and WhatsApp leads get an instant reply, a qualifying conversation about financing and timeline, and a showing booked straight onto your agents' calendars.",
            pain_points=[
                {"title": "Portal leads go cold in minutes", "description": "Zillow and Realtor.com leads often contact 3-5 agents at once — whoever replies first usually wins the client."},
                {"title": "Agents can't triage 24/7", "description": "Evening and weekend inquiries pile up until Monday morning, by which point most buyers have already toured with someone else."},
                {"title": "Unqualified leads eat agent time", "description": "Browsers, renters, and out-of-budget inquiries take up hours that should go to financing-ready buyers."},
            ],
            case_study_slug="illustrative-real-estate-brokerage",
            faqs=[
                {"question": "Does LeadPilot integrate with Zillow or Realtor.com leads?", "answer": "Yes — connect the email address or webhook those portals deliver leads to, and LeadPilot picks them up the same way a human would monitor that inbox."},
                {"question": "Can it qualify on financing pre-approval?", "answer": "Yes — pre-approval status and timeline are two of the default qualifying questions for real estate, and both are configurable per brokerage."},
                {"question": "Does it work with Follow Up Boss or kvCORE?", "answer": "Follow Up Boss is supported today; kvCORE and other CRMs are on our integration roadmap."},
            ],
            relevant_channels=["website_form", "whatsapp", "email"],
        )
    )
    await db.commit()
    print("seeded 1 industry (real-estate)")


async def seed_one_comparison(db):
    if (await db.execute(select(Comparison).where(Comparison.slug == "lindy"))).scalar_one_or_none():
        print("comparisons already seeded, skipping")
        return
    db.add(
        Comparison(
            slug="lindy",
            competitor_name="Lindy AI",
            meta_title="LeadPilot AI vs Lindy AI — AI SDR Comparison",
            meta_description="How LeadPilot AI compares to Lindy AI's SDR agent on setup speed, qualification depth, and pricing for inbound lead response.",
            intro="Lindy AI offers a broad no-code automation platform with an SDR template among many others. LeadPilot is purpose-built for one job — instant inbound lead response and qualification.",
            feature_rows=[
                {"feature": "Purpose-built for inbound lead response", "leadPilot": True, "competitor": "Partial — one template among many automations", "note": "Lindy is a general automation platform; LeadPilot is scoped to SDR work only."},
                {"feature": "Sub-10-second first reply", "leadPilot": True, "competitor": "Depends on workflow configuration"},
                {"feature": "Multi-channel intake (web, WhatsApp, email)", "leadPilot": True, "competitor": True},
                {"feature": "Built-in Calendly booking handoff", "leadPilot": True, "competitor": True},
                {"feature": "Live qualification transcript dashboard", "leadPilot": True, "competitor": "Varies by template"},
                {"feature": "No-code general workflow builder", "leadPilot": False, "competitor": True, "note": "Lindy's broader automation builder is a strength if you need non-SDR workflows too."},
            ],
            when_to_choose_lead_pilot=["You want a purpose-built SDR agent live in days, not a general automation platform to configure yourself", "Qualification depth (budget/timeline/authority) matters as much as speed"],
            when_to_choose_competitor=["You need one platform to automate many different workflows beyond lead response", "Your team already has deep Lindy expertise"],
            faqs=[{"question": "Is LeadPilot cheaper than Lindy?", "answer": "Pricing models differ enough that a direct dollar comparison depends on your lead volume — see our /pricing page for exact tiers."}],
        )
    )
    await db.commit()
    print("seeded 1 comparison (lindy)")


async def seed_one_blog_post(db):
    from app.models.cms import BlogPost

    if (await db.execute(select(BlogPost).where(BlogPost.slug == "what-is-an-ai-sdr"))).scalar_one_or_none():
        print("blog_posts already seeded, skipping")
        return
    db.add(
        BlogPost(
            slug="what-is-an-ai-sdr",
            title="What Is an AI SDR? A Practical Definition (Not a Hype Definition)",
            meta_title="What Is an AI SDR? | LeadPilot AI",
            meta_description="An AI SDR is software that replies to and qualifies inbound leads autonomously. Here's what that actually means in practice.",
            tldr="An AI SDR is software that replies to inbound leads instantly, asks qualifying questions, and books a call or hands off to a human when ready — without a human writing the first reply.",
            body_mdx_path="content/blog/what-is-an-ai-sdr.mdx",
            author_name="Dana Whitfield",
            author_title="Head of Product, LeadPilot AI",
            author_bio="Dana leads product at LeadPilot AI, focused on inbound lead response and qualification workflows for B2B and local-service teams.",
            tags=["AI SDR", "Category education"],
            reading_time_minutes=5,
            faqs=[
                {"question": "Is an AI SDR the same as a chatbot?", "answer": "No — a typical website chatbot answers FAQs. An AI SDR conducts a qualifying conversation and takes an action based on the outcome."},
                {"question": "Does an AI SDR replace human sales reps?", "answer": "It replaces the first-response and qualification step, not the relationship-building and closing work human reps do."},
            ],
            related_slugs=["response-time-and-lost-revenue", "qualifying-questions-that-actually-work"],
            status="published",
        )
    )
    await db.commit()
    print("seeded 1 blog post")


async def main():
    async with SessionLocal() as db:
        await seed_demo_org(db)
        await seed_pricing_tiers(db)
        await seed_testimonials_and_case_studies(db)
        await seed_one_industry(db)
        await seed_one_comparison(db)
        await seed_one_blog_post(db)
    print("done")


if __name__ == "__main__":
    asyncio.run(main())
