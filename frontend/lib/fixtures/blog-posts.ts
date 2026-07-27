import { BlogPostSchema, AuthorSchema, type BlogPost, type Author } from "@/lib/schema";

const authors: Author[] = [
  {
    id: "author_1",
    name: "Dana Whitfield",
    title: "Head of Product, LeadPilot AI",
    avatarSrc: "",
    bio: "Dana leads product at LeadPilot AI, focused on inbound lead response and qualification workflows for B2B and local-service teams.",
  },
  {
    id: "author_2",
    name: "Marcus Bell",
    title: "Founding Engineer, LeadPilot AI",
    avatarSrc: "",
    bio: "Marcus builds LeadPilot's qualification and real-time dashboard infrastructure.",
  },
];

const raw: BlogPost[] = [
  {
    slug: "what-is-an-ai-sdr",
    title: "What Is an AI SDR? A Practical Definition (Not a Hype Definition)",
    metaTitle: "What Is an AI SDR? | LeadPilot AI",
    metaDescription:
      "An AI SDR is software that replies to and qualifies inbound leads autonomously. Here's what that actually means in practice, and what it doesn't do.",
    tldr:
      "An AI SDR is software that replies to inbound leads instantly, asks qualifying questions (budget, timeline, need), and books a call or hands off to a human when the lead is ready — without a human writing the first reply. It's not a chatbot FAQ widget, and it's not a full autonomous closer.",
    bodyMdxPath: "content/blog/what-is-an-ai-sdr.mdx",
    author: authors[0]!,
    publishedAt: "2026-06-10T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    tags: ["AI SDR", "Category education"],
    coverImageSrc: "",
    readingTimeMinutes: 5,
    faqs: [
      { question: "Is an AI SDR the same as a chatbot?", answer: "No — a typical website chatbot answers FAQs. An AI SDR conducts a qualifying conversation and takes an action (booking a call, alerting a human) based on the outcome." },
      { question: "Does an AI SDR replace human sales reps?", answer: "It replaces the first-response and qualification step, not the relationship-building and closing work human reps do on qualified opportunities." },
    ],
    relatedSlugs: ["response-time-and-lost-revenue", "qualifying-questions-that-actually-work"],
  },
  {
    slug: "response-time-and-lost-revenue",
    title: "Why a 6-Hour Response Time Is Costing You Deals",
    metaTitle: "Lead Response Time and Lost Revenue | LeadPilot AI",
    metaDescription:
      "Response speed is one of the most reliable predictors of whether an inbound lead converts. Here's why slow replies quietly cost revenue.",
    tldr:
      "The single biggest predictor of whether an inbound lead converts is often how fast you reply — not how good your pitch is. Once a lead has waited hours, most have already engaged a faster-responding competitor or lost momentum entirely.",
    bodyMdxPath: "content/blog/response-time-and-lost-revenue.mdx",
    author: authors[0]!,
    publishedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    tags: ["Response time", "Conversion"],
    coverImageSrc: "",
    readingTimeMinutes: 4,
    relatedSlugs: ["what-is-an-ai-sdr", "qualifying-questions-that-actually-work"],
  },
  {
    slug: "qualifying-questions-that-actually-work",
    title: "5 Qualifying Questions Worth Asking Before a Sales Call",
    metaTitle: "Best Qualifying Questions for Inbound Leads | LeadPilot AI",
    metaDescription:
      "The right qualifying questions filter unqualified leads before they reach a rep's calendar. Here are five that consistently work.",
    tldr:
      "Good qualifying questions cover need, budget range, timeline, team/company size, and decision authority. Asked well — as a natural conversation, not an interrogation — they filter out a large share of leads that would otherwise waste a rep's time on a call.",
    bodyMdxPath: "content/blog/qualifying-questions-that-actually-work.mdx",
    author: authors[1]!,
    publishedAt: "2026-06-25T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    tags: ["Qualification", "Sales process"],
    coverImageSrc: "",
    readingTimeMinutes: 6,
    relatedSlugs: ["what-is-an-ai-sdr", "response-time-and-lost-revenue"],
  },
  {
    slug: "building-guardrails-for-an-ai-agent",
    title: "How We Think About Guardrails for an Autonomous Sales Agent",
    metaTitle: "Guardrails for AI Sales Agents | LeadPilot AI",
    metaDescription:
      "Letting an AI agent reply to real leads autonomously requires clear guardrails. Here's how LeadPilot approaches escalation and boundaries.",
    tldr:
      "An autonomous agent needs explicit boundaries: what it will never claim, when it hands off to a human, and how frustration or edge cases get escalated. We treat guardrails as a first-class configuration, not an afterthought.",
    bodyMdxPath: "content/blog/building-guardrails-for-an-ai-agent.mdx",
    author: authors[1]!,
    publishedAt: "2026-07-05T00:00:00Z",
    updatedAt: "2026-07-05T00:00:00Z",
    tags: ["Guardrails", "Trust & safety"],
    coverImageSrc: "",
    readingTimeMinutes: 5,
    relatedSlugs: ["what-is-an-ai-sdr"],
  },
];

export const blogPostsFixture = BlogPostSchema.array().parse(raw);

export function getBlogPostBySlug(slug: string) {
  return blogPostsFixture.find((p) => p.slug === slug) ?? null;
}

export function getRelatedPosts(post: BlogPost) {
  return post.relatedSlugs
    .map((slug) => getBlogPostBySlug(slug))
    .filter((p): p is BlogPost => p !== null);
}
