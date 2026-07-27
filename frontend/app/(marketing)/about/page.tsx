import type { Metadata } from "next";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About LeadPilot AI",
  description:
    "LeadPilot AI builds an autonomous AI SDR focused on one job: replying to and qualifying inbound leads faster than any human team can.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-2xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            We built LeadPilot because slow replies were the actual bottleneck
          </h1>
          <div className="prose prose-slate mt-8 max-w-none text-slate-600">
            <p>
              Most sales tools optimize the pitch — better copy, better sequencing, better
              analytics. We kept finding the same thing across teams we talked to: the biggest
              lever wasn&apos;t the pitch at all. It was how long a lead waited for any reply,
              good or bad.
            </p>
            <p>
              LeadPilot AI exists to close that gap specifically. Not a general automation
              platform, not an outbound prospecting tool — one job, done well: reply to every
              inbound lead in seconds, ask the qualifying questions your team already asks, and
              hand off only the conversations worth a human&apos;s time.
            </p>
            <h2>Where we are today</h2>
            <p>
              LeadPilot AI is early-stage. We&apos;re building in the open about what&apos;s real
              and what&apos;s still in progress — see our{" "}
              <a href="/security" className="text-signal-600 underline">
                security page
              </a>{" "}
              for an honest, current breakdown of our compliance posture, and our{" "}
              <a href="/blog" className="text-signal-600 underline">
                blog
              </a>{" "}
              for how we think about qualification, guardrails, and response time.
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
