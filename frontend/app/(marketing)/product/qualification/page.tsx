import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata, breadcrumbJsonLd, siteConfig } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { agentConfigFixture } from "@/lib/fixtures/agent-config";

export const metadata: Metadata = buildMetadata({
  title: "Qualification Logic Explained",
  description:
    "How LeadPilot scores a lead's budget, timeline, need, and decision authority to decide between booking a call and closing politely.",
  path: "/product/qualification",
});

export default function QualificationPage() {
  return (
    <div className="section-y">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Product", url: `${siteConfig.url}/product` },
          { name: "Qualification logic", url: `${siteConfig.url}/product/qualification` },
        ])}
      />
      <div className="container-lp max-w-3xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            How does LeadPilot decide if a lead is qualified?
          </h1>
          <p className="mt-6 text-slate-500">
            Every conversation is scored against configurable qualifying questions. Once a lead
            clears your handoff threshold, LeadPilot books a call. Below that threshold, it closes
            the conversation honestly instead of wasting your team&apos;s time.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-12 rounded-2xl border border-line bg-surface-2 p-6">
            <h2 className="font-display text-lg font-semibold text-ink-950">
              Default qualifying questions
            </h2>
            <ul className="mt-4 space-y-3">
              {agentConfigFixture.qualifyingQuestions.map((q) => (
                <li key={q.id} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal-600" />
                  <div>
                    <span className="text-ink-950">{q.prompt}</span>
                    {q.required && <span className="ml-2 text-xs text-slate-500">(required)</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-10">
            <h2 className="font-display text-2xl font-bold text-ink-950">
              Handoff threshold: {agentConfigFixture.handoffThreshold}/100
            </h2>
            <p className="mt-3 text-slate-500">
              Every conversation gets a qualification score from 0-100 based on how completely and
              positively the lead answered. Above your configured handoff threshold, LeadPilot books
              directly onto your calendar. Below it, the lead is either nurtured or closed —
              your choice, set per qualifying question.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="mt-10">
            <h2 className="font-display text-2xl font-bold text-ink-950">Guardrails on every conversation</h2>
            <ul className="mt-3 space-y-2 text-slate-500">
              {agentConfigFixture.guardrails.map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-500" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
