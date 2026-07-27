import { Zap, Brain, ShieldCheck, Radio, LayoutDashboard, BellRing } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant reply engine",
    description: "Low-latency inference means the first reply lands in seconds, not minutes.",
    span: "lg:col-span-2",
  },
  {
    icon: Brain,
    title: "Qualification logic",
    description: "Structured qualifying questions mapped to your criteria — budget, timeline, need, authority.",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Guardrails & handoff",
    description: "Configurable boundaries and a handoff threshold hand tricky conversations to a human.",
    span: "",
  },
  {
    icon: Radio,
    title: "Multi-channel intake",
    description: "Website forms, WhatsApp, and email all feed the same qualification flow.",
    span: "",
  },
  {
    icon: LayoutDashboard,
    title: "Live dashboard",
    description: "Every conversation, qualification score, and outcome visible in real time.",
    span: "",
  },
  {
    icon: BellRing,
    title: "Notifications",
    description: "Slack and email alerts fire the moment a lead is qualified or booked.",
    span: "lg:col-span-2",
  },
];

export function FeatureBentoGrid() {
  return (
    <section className="section-y">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Everything an inbound SDR does — automated
            </h2>
          </div>
        </FadeIn>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.05} className={feature.span}>
              <div className="h-full rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-signal-500/10 text-signal-600">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-ink-950">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
