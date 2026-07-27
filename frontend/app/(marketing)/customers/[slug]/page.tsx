import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, breadcrumbJsonLd, siteConfig } from "@/lib/seo";
import { caseStudiesFixture, getCaseStudyBySlug } from "@/lib/fixtures/testimonials";

export function generateStaticParams() {
  return caseStudiesFixture.map((cs) => ({ slug: cs.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const cs = getCaseStudyBySlug(params.slug);
  if (!cs) return {};
  return buildMetadata({
    title: `${cs.companyName} Case Study`,
    description: cs.summary,
    path: `/customers/${cs.slug}`,
  });
}

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const cs = getCaseStudyBySlug(params.slug);
  if (!cs) notFound();

  return (
    <div className="section-y">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Customers", url: `${siteConfig.url}/customers` },
          { name: cs.companyName, url: `${siteConfig.url}/customers/${cs.slug}` },
        ])}
      />
      <div className="container-lp max-w-3xl">
        <FadeIn>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{cs.industry}</span>
            {cs.isIllustrative && <Badge variant="neutral">Illustrative example</Badge>}
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            {cs.companyName}
          </h1>
          <p className="mt-4 text-lg text-slate-500">{cs.summary}</p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {cs.metrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-line bg-surface-2 p-5">
                <div className="font-display text-2xl font-bold text-ink-950">{metric.value}</div>
                <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="prose prose-slate mt-10 max-w-none">
            <p>{cs.narrative}</p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
