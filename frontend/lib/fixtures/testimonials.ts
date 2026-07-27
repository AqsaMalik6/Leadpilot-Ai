import { TestimonialSchema, CaseStudySchema, type Testimonial, type CaseStudy } from "@/lib/schema";

// isIllustrative: true on every entry — LeadPilot AI has no real customers yet.
// Never flip this flag without a genuine, consented customer quote behind it
// (see the global honesty policy, SKILL-FRONTEND.md §3.8).
const raw: Testimonial[] = [
  {
    id: "test_1",
    quote:
      "If a real estate brokerage ran 40 leads a week through this, the math is simple: a 7-second reply beats a 6-hour one every time.",
    authorName: "Illustrative example",
    authorTitle: "Based on typical brokerage response-time data",
    companyName: "Illustrative brokerage",
    companyLogoSrc: null,
    avatarSrc: null,
    metricCallout: "7s avg. first reply",
    isIllustrative: true,
  },
  {
    id: "test_2",
    quote:
      "A home services team with after-hours call overflow could realistically recover a meaningful share of jobs currently lost to voicemail.",
    authorName: "Illustrative example",
    authorTitle: "Based on typical home-services intake patterns",
    companyName: "Illustrative home services team",
    companyLogoSrc: null,
    avatarSrc: null,
    metricCallout: "24/7 coverage",
    isIllustrative: true,
  },
  {
    id: "test_3",
    quote:
      "For a B2B SaaS team, automatically filtering out non-buyers before they reach a rep's calendar saves real selling hours every week.",
    authorName: "Illustrative example",
    authorTitle: "Based on typical SDR qualification workloads",
    companyName: "Illustrative SaaS company",
    companyLogoSrc: null,
    avatarSrc: null,
    metricCallout: "~60% fewer unqualified calls",
    isIllustrative: true,
  },
];

export const testimonialsFixture = TestimonialSchema.array().parse(raw);

const caseStudiesRaw: CaseStudy[] = [
  {
    slug: "illustrative-real-estate-brokerage",
    companyName: "Illustrative Brokerage Example",
    industry: "Real estate",
    summary:
      "An illustrative walkthrough of how a 12-agent brokerage could use LeadPilot to respond to Zillow and website leads in seconds instead of hours.",
    metrics: [
      { label: "First-reply time", value: "7 seconds" },
      { label: "Leads qualified before agent contact", value: "~60%" },
      { label: "Booked showings per week", value: "+18 (illustrative)" },
    ],
    narrative:
      "This is a modeled scenario, not a completed engagement: a 12-agent brokerage receiving roughly 40 leads a week from Zillow and its website connects its lead channels to LeadPilot. Every inbound message gets an instant reply, a short qualifying conversation about financing and timeline, and — for buyers who are ready — a showing booked directly onto an agent's calendar. Leads that aren't ready yet are tagged and routed to a nurture sequence instead of an agent's inbox.",
    isIllustrative: true,
    publishedAt: "2026-06-01T00:00:00Z",
  },
  {
    slug: "illustrative-home-services-team",
    companyName: "Illustrative Home Services Example",
    industry: "Home services",
    summary:
      "An illustrative model of how a 3-branch HVAC and plumbing company could close the after-hours response gap that costs jobs to competitors.",
    metrics: [
      { label: "Coverage window", value: "24/7 (illustrative)" },
      { label: "After-hours jobs triaged", value: "~30/month (illustrative)" },
    ],
    narrative:
      "This is a modeled scenario: a home services company with three branches routes after-hours calls and web form submissions to LeadPilot instead of voicemail. Urgent jobs are triaged and an on-call technician is notified immediately; routine requests are qualified and queued for the morning dispatch review.",
    isIllustrative: true,
    publishedAt: "2026-06-08T00:00:00Z",
  },
];

export const caseStudiesFixture = CaseStudySchema.array().parse(caseStudiesRaw);

export function getCaseStudyBySlug(slug: string) {
  return caseStudiesFixture.find((c) => c.slug === slug) ?? null;
}
