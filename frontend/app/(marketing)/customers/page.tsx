import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";
import { caseStudiesFixture } from "@/lib/fixtures/testimonials";

export const metadata: Metadata = buildMetadata({
  title: "Customer Stories",
  description: "How teams use LeadPilot AI to respond to and qualify inbound leads faster.",
  path: "/customers",
});

export default function CustomersPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-3xl text-center">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Customer stories
          </h1>
          <p className="mt-6 text-slate-500">
            LeadPilot AI is early-stage — the walkthroughs below are illustrative, modeled scenarios
            based on real response-time and qualification patterns, clearly labeled as such.
            We&apos;ll replace these with real customer case studies as soon as we have them.
          </p>
        </FadeIn>
      </div>
      <div className="container-lp mt-12 grid gap-6 md:grid-cols-2">
        {caseStudiesFixture.map((cs, i) => (
          <FadeIn key={cs.slug} delay={i * 0.1}>
            <Link
              href={`/customers/${cs.slug}`}
              className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{cs.industry}</span>
                  <h2 className="mt-1 font-display text-lg font-semibold text-ink-950">{cs.companyName}</h2>
                </div>
                {cs.isIllustrative && <Badge variant="neutral">Illustrative</Badge>}
              </div>
              <p className="mt-3 flex-1 text-sm text-slate-500">{cs.summary}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-signal-600">
                Read the walkthrough <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
