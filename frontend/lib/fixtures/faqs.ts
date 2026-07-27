import { z } from "zod";

export const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
  category: z.enum(["general", "product", "pricing", "security", "onboarding"]),
});
export type FaqItem = z.infer<typeof FaqItemSchema>;

const raw: FaqItem[] = [
  {
    question: "How fast does LeadPilot respond to a new lead?",
    answer:
      "LeadPilot replies to new inbound leads in under 10 seconds on average, using low-latency inference so the first response lands while the lead's attention is still on your business.",
    category: "product",
  },
  {
    question: "What channels does LeadPilot support?",
    answer:
      "Website forms, WhatsApp Business, and email today. SMS and additional channels are on our roadmap.",
    category: "product",
  },
  {
    question: "Does LeadPilot replace my sales team?",
    answer:
      "No — LeadPilot handles the first reply and qualification step, then hands off qualified leads to your team via a booked call or a notification. Closing and relationship-building stay with your humans.",
    category: "product",
  },
  {
    question: "Can I customize the qualifying questions?",
    answer:
      "Yes — qualifying questions, guardrails, persona/tone, and the handoff threshold are all configurable from your dashboard's agent configuration page.",
    category: "product",
  },
  {
    question: "How does pricing work?",
    answer:
      "Plans are tiered by monthly lead volume, from Starter (250 leads/mo) up to custom Enterprise agreements. See the /pricing page for exact tiers and a feature comparison.",
    category: "pricing",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes — every plan starts with a free trial so you can connect a real lead channel and see LeadPilot qualify actual inbound leads before paying anything.",
    category: "pricing",
  },
  {
    question: "Is my data secure?",
    answer:
      "We follow standard security practices for handling customer and lead data. A SOC 2 audit is in progress, not yet complete — see /security for an honest, current breakdown of what's in place today.",
    category: "security",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most teams connect their first lead channel and send a test lead through the onboarding wizard within 15-20 minutes.",
    category: "onboarding",
  },
];

export const faqsFixture = FaqItemSchema.array().parse(raw);

export function getFaqsByCategory(category: FaqItem["category"]) {
  return faqsFixture.filter((f) => f.category === category);
}
