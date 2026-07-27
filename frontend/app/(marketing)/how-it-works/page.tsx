import type { Metadata } from "next";
import { HowItWorksTimeline } from "@/components/marketing/how-it-works-timeline";
import { DemoSection } from "@/components/marketing/demo/demo-section";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, howToJsonLd } from "@/lib/seo";
import { faqsFixture } from "@/lib/fixtures/faqs";

export const metadata: Metadata = buildMetadata({
  title: "How It Works — The 4-Step AI SDR Flow",
  description:
    "See exactly how LeadPilot replies to a new lead, asks qualifying questions, and books a call or closes politely — in under 10 seconds.",
  path: "/how-it-works",
});

const steps = [
  {
    name: "Lead comes in",
    text: "A website form submission, WhatsApp message, or email arrives in one of your connected channels.",
  },
  {
    name: "AI replies instantly",
    text: "LeadPilot responds in under 10 seconds, engaging directly with what the lead asked.",
  },
  {
    name: "AI asks qualifying questions",
    text: "A natural conversation covers need, budget range, timeline, team size, and decision authority.",
  },
  {
    name: "AI decides",
    text: "Qualified leads get a Calendly link and your team gets a Slack/email alert. Others are closed politely with a clear next step.",
  },
];

const productFaqs = faqsFixture.filter((f) => f.category === "product");

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd data={howToJsonLd(steps)} />
      <div className="section-y">
        <div className="container-lp max-w-3xl text-center">
          <FadeIn>
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              How LeadPilot AI qualifies an inbound lead
            </h1>
            <p className="mt-6 text-slate-500">
              LeadPilot replies to every inbound lead in under 10 seconds, using Groq&apos;s
              low-latency inference for the first reply and a structured qualifying conversation
              built on the OpenAI Agents SDK. Here&apos;s exactly what happens, step by step.
            </p>
          </FadeIn>
        </div>
      </div>
      <HowItWorksTimeline />

      <div className="section-y">
        <div className="container-lp max-w-3xl">
          <FadeIn>
            <h2 className="font-display text-2xl font-bold text-ink-950">
              What happens inside each step
            </h2>
          </FadeIn>
          <div className="mt-8 space-y-8">
            <FadeIn delay={0.05}>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-950">
                  1. Lead comes in — every channel feeds the same flow
                </h3>
                <p className="mt-2 text-slate-500">
                  Whether a lead fills out your website form, messages your WhatsApp Business
                  number, or emails a shared inbox, it lands in the same qualification pipeline —
                  no separate process per channel to maintain.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-950">
                  2. AI replies instantly — why speed is the whole point
                </h3>
                <p className="mt-2 text-slate-500">
                  LeadPilot uses Groq&apos;s low-latency inference to generate and send the first
                  reply in under 10 seconds on average — while the lead&apos;s attention is still on
                  your business, not a faster-responding competitor.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-950">
                  3. AI asks qualifying questions — configurable, not generic
                </h3>
                <p className="mt-2 text-slate-500">
                  Every qualifying question is configurable from your agent configuration page —
                  what to ask, in what order, and which answers count as a qualifying signal for
                  your specific business.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-950">
                  4. AI decides — booking, handoff, or a polite close
                </h3>
                <p className="mt-2 text-slate-500">
                  Leads that clear your handoff threshold get a Calendly link and your team gets
                  notified in Slack or email. Leads that aren&apos;t a fit are closed honestly, with
                  no dead-end silence.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      <DemoSection />
      <FaqAccordion items={productFaqs} title="Product questions" />
    </>
  );
}
