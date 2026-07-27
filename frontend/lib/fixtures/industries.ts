import { IndustrySchema, type Industry } from "@/lib/schema";

const raw: Industry[] = [
  {
    slug: "real-estate",
    name: "Real Estate",
    metaTitle: "AI SDR for Real Estate Teams | LeadPilot AI",
    metaDescription:
      "LeadPilot replies to Zillow, website, and WhatsApp leads in seconds, qualifies buyers on financing and timeline, and books showings automatically.",
    heroHeadline: "Your AI SDR for real estate — never lose a lead to a slow reply again",
    heroSubhead:
      "Zillow, website, and WhatsApp leads get an instant reply, a qualifying conversation about financing and timeline, and a showing booked straight onto your agents' calendars.",
    painPoints: [
      { title: "Portal leads go cold in minutes", description: "Zillow and Realtor.com leads often contact 3-5 agents at once — whoever replies first usually wins the client." },
      { title: "Agents can't triage 24/7", description: "Evening and weekend inquiries pile up until Monday morning, by which point most buyers have already toured with someone else." },
      { title: "Unqualified leads eat agent time", description: "Browsers, renters, and out-of-budget inquiries take up hours that should go to financing-ready buyers." },
    ],
    caseStudySlug: "illustrative-real-estate-brokerage",
    faqs: [
      { question: "Does LeadPilot integrate with Zillow or Realtor.com leads?", answer: "Yes — connect the email address or webhook those portals deliver leads to, and LeadPilot picks them up the same way a human would monitor that inbox." },
      { question: "Can it qualify on financing pre-approval?", answer: "Yes — pre-approval status and timeline are two of the default qualifying questions for real estate, and both are configurable per brokerage." },
      { question: "Does it work with Follow Up Boss or kvCORE?", answer: "Follow Up Boss is supported today; kvCORE and other CRMs are on our integration roadmap — reach out and we'll confirm timing for your stack." },
    ],
    relevantChannels: ["website_form", "whatsapp", "email"],
    publishedAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "home-services",
    name: "Home Services",
    metaTitle: "AI SDR for Home Services | LeadPilot AI",
    metaDescription:
      "LeadPilot answers every HVAC, plumbing, and electrical inquiry instantly — day or night — and routes urgent jobs to your on-call technician.",
    heroHeadline: "Stop losing after-hours jobs to voicemail",
    heroSubhead:
      "LeadPilot replies to every inbound job request around the clock, triages urgency, and gets your on-call technician on the phone within minutes for anything that can't wait until morning.",
    painPoints: [
      { title: "After-hours calls go to voicemail", description: "Emergency jobs — a burst pipe, a dead AC in summer — go to the first competitor who picks up the phone." },
      { title: "Dispatch can't tell urgent from routine", description: "Without triage, a routine maintenance request and a flooding basement land in the same queue." },
      { title: "Multi-branch teams lack a single intake process", description: "Each branch handles inbound leads differently, so response quality varies by location." },
    ],
    caseStudySlug: "illustrative-home-services-team",
    faqs: [
      { question: "Can LeadPilot tell the difference between urgent and routine jobs?", answer: "Yes — you define the urgency signals (e.g. \"flooding,\" \"no heat,\" \"no power\") and LeadPilot escalates matching messages directly to your on-call line." },
      { question: "Does it work across multiple branches?", answer: "Yes — each branch can have its own qualifying questions, on-call contact, and Calendly/dispatch routing." },
      { question: "What channels does it cover for home services?", answer: "Website form, WhatsApp, and email today; SMS is on our roadmap." },
    ],
    relevantChannels: ["website_form", "whatsapp", "email"],
    publishedAt: "2026-05-05T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "b2b-saas",
    name: "B2B SaaS",
    metaTitle: "AI SDR for B2B SaaS Sales Teams | LeadPilot AI",
    metaDescription:
      "LeadPilot replies to demo requests and trial signups instantly, qualifies on budget, timeline, and authority, then books calls onto your AEs' calendars.",
    heroHeadline: "Qualify inbound demo requests before they hit your AEs' calendars",
    heroSubhead:
      "LeadPilot replies to every demo request or trial signup in seconds, asks the qualifying questions your SDR team already asks, and only books time with buyers who are actually ready.",
    painPoints: [
      { title: "AEs waste calls on unqualified prospects", description: "Students, competitors, and browsers request demos alongside genuine buyers, and manual triage doesn't scale." },
      { title: "Demo requests go stale overnight", description: "A prospect who requests a demo at 9pm often books with a faster-moving competitor by the next morning." },
      { title: "SDR headcount is expensive to scale", description: "Hiring another SDR to cover response-time gaps costs $3-5k/month before ramp time is even factored in." },
    ],
    caseStudySlug: null,
    faqs: [
      { question: "Can LeadPilot qualify on BANT-style criteria?", answer: "Yes — budget, timeline, need, and decision authority are all configurable qualifying questions, matching a standard BANT/MEDDIC-lite flow." },
      { question: "Does it integrate with our CRM?", answer: "HubSpot is supported today; Salesforce and others are on our roadmap." },
      { question: "Can it detect and filter out non-buyer signups (students, competitors)?", answer: "Yes — guardrail rules let you flag and route non-ICP signups away from your AE calendar automatically." },
    ],
    relevantChannels: ["website_form", "email"],
    publishedAt: "2026-05-10T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "marketing-agencies",
    name: "Marketing Agencies",
    metaTitle: "AI SDR for Marketing & Creative Agencies | LeadPilot AI",
    metaDescription:
      "LeadPilot replies to new-business inquiries instantly, qualifies on budget and scope, and books discovery calls directly onto your account team's calendar.",
    heroHeadline: "Never let a new-business inquiry sit in your inbox overnight",
    heroSubhead:
      "LeadPilot replies to every new-business inquiry instantly, asks about budget and scope, and books a discovery call only with prospects who match your agency's minimum engagement size.",
    painPoints: [
      { title: "New-business inbox is nobody's full-time job", description: "Inquiries sit unanswered while account leads are in client work, and by the time someone replies, the prospect has moved on." },
      { title: "Scope mismatches waste discovery calls", description: "Prospects far below your minimum engagement size still take up a 30-minute call before the mismatch becomes clear." },
      { title: "Referral leads deserve a fast, polished first touch", description: "A slow or generic auto-reply undercuts the credibility a referral brings in." },
    ],
    caseStudySlug: null,
    faqs: [
      { question: "Can LeadPilot filter by budget minimum?", answer: "Yes — set a minimum monthly or project budget, and prospects below it are routed to a lightweight self-serve resource instead of a discovery call." },
      { question: "Does it match our agency's tone?", answer: "Yes — persona and tone are configurable per agent config, from formal to conversational." },
      { question: "Can referral leads get a different flow than cold inbound?", answer: "Yes — qualifying questions and routing rules can differ by lead source." },
    ],
    relevantChannels: ["website_form", "email"],
    publishedAt: "2026-05-15T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  },
];

export const industriesFixture = IndustrySchema.array().parse(raw);

export function getIndustryBySlug(slug: string) {
  return industriesFixture.find((i) => i.slug === slug) ?? null;
}
