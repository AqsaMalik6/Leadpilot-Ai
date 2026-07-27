import { MessageSquareText, Zap, ListChecks, CalendarCheck } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Lead comes in",
    description: "A website form, WhatsApp message, or email lands in one of your connected channels.",
  },
  {
    icon: Zap,
    title: "AI replies instantly",
    description: "LeadPilot responds in seconds, introducing itself and engaging with what the lead asked.",
  },
  {
    icon: ListChecks,
    title: "AI asks qualifying questions",
    description: "A short, natural conversation covers budget, timeline, and need — no interrogation.",
  },
  {
    icon: CalendarCheck,
    title: "AI decides",
    description: "Qualified leads get a Calendly link and your team gets a Slack/email alert. Others close politely.",
  },
];

export function HowItWorksTimeline() {
  return (
    <section className="section-y bg-surface-2">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              How LeadPilot AI qualifies an inbound lead
            </h2>
            <p className="mt-4 text-slate-500">
              The same four-step flow, every time — no matter which channel the lead comes from.
            </p>
          </div>
        </FadeIn>
        <div className="mt-14 grid gap-8 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.1} className="relative">
              <div className="flex flex-col items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-signal-500 text-ink-950">
                  <step.icon className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-signal-600">
                    Step {i + 1}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-semibold text-ink-950">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{step.description}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="absolute right-0 top-6 hidden h-px w-8 translate-x-full bg-line lg:block" />
              )}
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
