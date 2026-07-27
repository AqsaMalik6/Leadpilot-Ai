import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeatureBentoGrid } from "@/components/marketing/feature-bento-grid";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Product — AI SDR Capabilities",
  description:
    "Instant reply, structured qualification, guardrails, multi-channel intake, a live dashboard, and notifications — everything an inbound SDR does, automated.",
  path: "/product",
});

const SUBPAGES = [
  { title: "Qualification logic", description: "How LeadPilot scores and qualifies every lead.", href: "/product/qualification" },
  { title: "Integrations", description: "Connect WhatsApp, email, your website, Calendly, Slack, and more.", href: "/product/integrations" },
];

export default function ProductPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-3xl text-center">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Everything an inbound SDR does — automated
          </h1>
          <p className="mt-6 text-slate-500">
            LeadPilot AI isn&apos;t a single feature — it&apos;s the full loop from first reply to
            booked call, with the guardrails a real business needs to trust an autonomous agent.
          </p>
        </FadeIn>
      </div>
      <FeatureBentoGrid />
      <div className="container-lp mt-8 grid gap-6 sm:grid-cols-2">
        {SUBPAGES.map((page) => (
          <FadeIn key={page.href}>
            <Link
              href={page.href}
              className="flex items-center justify-between rounded-xl border border-line bg-surface p-6 transition-shadow hover:shadow-md"
            >
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-950">{page.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{page.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
