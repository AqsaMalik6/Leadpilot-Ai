import type { Metadata } from "next";
import { ShieldCheck, Lock, Database, Clock } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Security & Data Handling",
  description:
    "An honest, current breakdown of LeadPilot AI's security posture and data handling — including what's in progress, not just what's complete.",
  path: "/security",
});

const CONTROLS = [
  {
    icon: Lock,
    title: "Session security",
    status: "In place",
    description:
      "Authentication uses httpOnly, Secure, SameSite=Lax session cookies — never stored in localStorage or exposed to client-side scripts.",
  },
  {
    icon: Database,
    title: "Data handling",
    status: "In place",
    description:
      "Lead and conversation data is scoped per organization. We do not sell lead data or use it to train models for other customers.",
  },
  {
    icon: ShieldCheck,
    title: "SOC 2 Type II",
    status: "In progress",
    description:
      "We are in the process of pursuing SOC 2 Type II certification. We have not completed an audit yet — we won't claim otherwise.",
  },
  {
    icon: Clock,
    title: "Data retention & deletion",
    status: "In place",
    description:
      "Organizations can request full data export or deletion at any time from account settings.",
  },
];

export default function SecurityPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-3xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Security & data handling
          </h1>
          <p className="mt-6 text-slate-500">
            LeadPilot AI is an early-stage company. This page reflects our actual current posture —
            including what&apos;s still in progress — rather than compliance claims we haven&apos;t
            earned yet.
          </p>
        </FadeIn>

        <div className="mt-12 space-y-6">
          {CONTROLS.map((control, i) => (
            <FadeIn key={control.title} delay={i * 0.05}>
              <div className="flex gap-4 rounded-xl border border-line bg-surface p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-signal-500/10 text-signal-600">
                  <control.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-ink-950">{control.title}</h2>
                    <Badge variant={control.status === "In place" ? "qualified" : "new"}>
                      {control.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{control.description}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.3}>
          <div className="mt-10 rounded-xl border border-line bg-surface-2 p-6 text-sm text-slate-500">
            Have a specific security or compliance question for a procurement review? Reach out via{" "}
            <a href="/contact" className="font-medium text-signal-600 underline">
              our contact form
            </a>{" "}
            and we&apos;ll respond directly, not with a generic template.
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
