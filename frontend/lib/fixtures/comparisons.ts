import { ComparisonSchema, type Comparison } from "@/lib/schema";

const raw: Comparison[] = [
  {
    slug: "lindy",
    competitorName: "Lindy AI",
    metaTitle: "LeadPilot AI vs Lindy AI — AI SDR Comparison",
    metaDescription:
      "How LeadPilot AI compares to Lindy AI's SDR agent on setup speed, qualification depth, and pricing for inbound lead response.",
    intro:
      "Lindy AI offers a broad no-code automation platform with an SDR template among many others. LeadPilot is purpose-built for one job — instant inbound lead response and qualification — which shows up in setup time and default qualification depth.",
    featureRows: [
      { feature: "Purpose-built for inbound lead response", leadPilot: true, competitor: "Partial — one template among many automations", note: "Lindy is a general automation platform; LeadPilot is scoped to SDR work only." },
      { feature: "Sub-10-second first reply", leadPilot: true, competitor: "Depends on workflow configuration" },
      { feature: "Multi-channel intake (web, WhatsApp, email)", leadPilot: true, competitor: true },
      { feature: "Built-in Calendly booking handoff", leadPilot: true, competitor: true },
      { feature: "Live qualification transcript dashboard", leadPilot: true, competitor: "Varies by template" },
      { feature: "No-code general workflow builder", leadPilot: false, competitor: true, note: "Lindy's broader automation builder is a strength if you need non-SDR workflows too." },
    ],
    whenToChooseLeadPilot: [
      "You want a purpose-built SDR agent live in days, not a general automation platform to configure yourself",
      "Qualification depth (budget/timeline/authority) matters as much as speed",
    ],
    whenToChooseCompetitor: [
      "You need one platform to automate many different workflows beyond lead response",
      "Your team already has deep Lindy expertise",
    ],
    faqs: [
      { question: "Is LeadPilot cheaper than Lindy?", answer: "Pricing models differ enough (usage-based automation credits vs. flat SDR tiers) that a direct dollar comparison depends on your lead volume — see our /pricing page for exact tiers." },
    ],
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "artisan",
    competitorName: "Artisan (Ava)",
    metaTitle: "LeadPilot AI vs Artisan (Ava) — AI SDR Comparison",
    metaDescription:
      "How LeadPilot AI compares to Artisan's Ava on inbound vs. outbound focus, qualification logic, and pricing.",
    intro:
      "Artisan's Ava is built primarily for outbound prospecting — finding, enriching, and emailing cold leads at scale. LeadPilot is built for inbound — replying to and qualifying leads that already reached out to you.",
    featureRows: [
      { feature: "Inbound lead reply & qualification", leadPilot: true, competitor: "Not the primary focus", note: "Ava is optimized for outbound sequencing, not inbound response speed." },
      { feature: "Outbound prospecting & list-building", leadPilot: false, competitor: true, note: "Not a LeadPilot use case — see Artisan for outbound." },
      { feature: "Sub-10-second inbound reply", leadPilot: true, competitor: false },
      { feature: "Live dashboard of qualification conversations", leadPilot: true, competitor: "Focused on outbound sequence analytics instead" },
      { feature: "Calendly booking handoff", leadPilot: true, competitor: true },
    ],
    whenToChooseLeadPilot: [
      "Your bottleneck is inbound leads going unanswered, not a lack of outbound volume",
      "You want a live transcript of every qualification conversation",
    ],
    whenToChooseCompetitor: [
      "Your primary goal is outbound list-building and cold outreach at scale",
    ],
    faqs: [
      { question: "Can I use both LeadPilot and Artisan together?", answer: "Yes — many teams use an outbound tool like Artisan to generate pipeline and LeadPilot to handle the inbound replies that outbound generates." },
    ],
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "11x",
    competitorName: "11x.ai (Alice/Ali)",
    metaTitle: "LeadPilot AI vs 11x.ai — AI SDR Comparison",
    metaDescription:
      "How LeadPilot AI compares to 11x.ai's Alice and Ali digital workers on scope, pricing model, and inbound qualification depth.",
    intro:
      "11x.ai positions Alice and Ali as full \"digital workers\" spanning both outbound (Alice) and inbound (Ali) motions. LeadPilot focuses specifically on inbound reply and qualification, which keeps setup narrower and faster.",
    featureRows: [
      { feature: "Dedicated inbound-only agent", leadPilot: true, competitor: "Ali covers inbound within a broader digital-worker suite" },
      { feature: "Multi-channel intake (web, WhatsApp, email)", leadPilot: true, competitor: true },
      { feature: "Outbound prospecting agent included", leadPilot: false, competitor: true, note: "11x bundles an outbound agent (Alice); LeadPilot does not." },
      { feature: "Transparent self-serve pricing tiers", leadPilot: true, competitor: "Primarily sales-assisted pricing" },
      { feature: "Live qualification transcript dashboard", leadPilot: true, competitor: true },
    ],
    whenToChooseLeadPilot: [
      "You want self-serve pricing you can see without booking a sales call",
      "You only need inbound coverage, not a bundled outbound agent",
    ],
    whenToChooseCompetitor: [
      "You want both outbound and inbound digital workers from a single vendor",
    ],
    faqs: [
      { question: "Does LeadPilot offer an outbound agent like Alice?", answer: "Not currently — LeadPilot is scoped to inbound lead response and qualification only." },
    ],
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "regie",
    competitorName: "Regie.ai",
    metaTitle: "LeadPilot AI vs Regie.ai — AI SDR Comparison",
    metaDescription:
      "How LeadPilot AI compares to Regie.ai on content personalization depth versus response speed for inbound leads.",
    intro:
      "Regie.ai emphasizes AI-assisted content and personalization for SDR teams, often as a copiloting layer alongside human reps. LeadPilot is a fully autonomous agent focused on immediate inbound response, not a drafting assistant for humans.",
    featureRows: [
      { feature: "Fully autonomous inbound reply (no human in the loop)", leadPilot: true, competitor: "Often human-in-the-loop by design", note: "Regie is frequently deployed as an assistant to human SDRs rather than a replacement for the first reply." },
      { feature: "Sub-10-second first reply", leadPilot: true, competitor: "Depends on human review step" },
      { feature: "AI-assisted message drafting for human reps", leadPilot: false, competitor: true, note: "Not a LeadPilot focus — LeadPilot sends replies directly." },
      { feature: "Qualification logic (budget/timeline/authority)", leadPilot: true, competitor: "Varies by workflow" },
      { feature: "Multi-channel intake (web, WhatsApp, email)", leadPilot: true, competitor: "Primarily email-focused" },
    ],
    whenToChooseLeadPilot: [
      "You want the first reply sent autonomously, without a human review step",
      "Speed of first response is your primary bottleneck",
    ],
    whenToChooseCompetitor: [
      "You want AI to draft messages that a human SDR reviews and personalizes before sending",
    ],
    faqs: [
      { question: "Does LeadPilot require a human to approve replies?", answer: "No — by default LeadPilot replies autonomously within its configured guardrails. A handoff threshold can route any conversation to a human at a point you choose." },
    ],
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    slug: "alignment-ai",
    competitorName: "Alignment AI",
    metaTitle: "LeadPilot AI vs Alignment AI — AI SDR Comparison",
    metaDescription:
      "How LeadPilot AI compares to Alignment AI on self-serve setup versus enterprise demo-request sales motion.",
    intro:
      "Alignment AI targets enterprise buyers with a demo-request sales motion and a broader platform architecture. LeadPilot is self-serve — you can sign up and connect your first lead channel today without a sales call.",
    featureRows: [
      { feature: "Self-serve signup (no sales call required)", leadPilot: true, competitor: "Demo-request only" },
      { feature: "Time to first live lead", leadPilot: "Same day", competitor: "Typically weeks (enterprise onboarding)" },
      { feature: "Enterprise compliance/security depth", leadPilot: "In progress — see /security", competitor: true, note: "Alignment's enterprise-first positioning means deeper compliance tooling today." },
      { feature: "Live qualification transcript dashboard", leadPilot: true, competitor: true },
      { feature: "Transparent self-serve pricing", leadPilot: true, competitor: "Demo-request pricing only" },
    ],
    whenToChooseLeadPilot: [
      "You want to be live with your first lead channel today, not after a multi-week enterprise rollout",
      "You're a small-to-mid-size team, not an enterprise requiring a dedicated implementation team",
    ],
    whenToChooseCompetitor: [
      "You're an enterprise buyer that needs deep compliance tooling and a dedicated implementation team from day one",
    ],
    faqs: [
      { question: "Is LeadPilot enterprise-ready?", answer: "LeadPilot works well for small-to-mid-size teams today. Our security posture is documented honestly on /security — SOC 2 is in progress, not complete, so enterprise buyers with strict compliance requirements should review that page first." },
    ],
    updatedAt: "2026-07-01T00:00:00Z",
  },
];

export const comparisonsFixture = ComparisonSchema.array().parse(raw);

export function getComparisonBySlug(slug: string) {
  return comparisonsFixture.find((c) => c.slug === slug) ?? null;
}
