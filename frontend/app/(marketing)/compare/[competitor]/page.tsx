import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, breadcrumbJsonLd, siteConfig } from "@/lib/seo";
import { comparisonsFixture, getComparisonBySlug } from "@/lib/fixtures/comparisons";

export function generateStaticParams() {
  return comparisonsFixture.map((c) => ({ competitor: c.slug }));
}

export function generateMetadata({ params }: { params: { competitor: string } }): Metadata {
  const comparison = getComparisonBySlug(params.competitor);
  if (!comparison) return {};
  return buildMetadata({
    title: comparison.metaTitle,
    description: comparison.metaDescription,
    path: `/compare/${comparison.slug}`,
  });
}

function renderCell(value: boolean | string) {
  if (typeof value === "string") return <span className="text-sm text-ink-950">{value}</span>;
  return value ? (
    <Check className="mx-auto h-4 w-4 text-signal-600" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-300" />
  );
}

export default function ComparePage({ params }: { params: { competitor: string } }) {
  const comparison = getComparisonBySlug(params.competitor);
  if (!comparison) notFound();

  return (
    <div className="section-y">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Compare", url: `${siteConfig.url}/pricing` },
          { name: comparison.competitorName, url: `${siteConfig.url}/compare/${comparison.slug}` },
        ])}
      />
      <div className="container-lp max-w-3xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            LeadPilot AI vs {comparison.competitorName}
          </h1>
          <p className="mt-6 text-slate-500">{comparison.intro}</p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-10 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th className="p-4 text-left font-medium text-slate-500">Feature</th>
                  <th className="p-4 text-center font-medium text-ink-950">LeadPilot AI</th>
                  <th className="p-4 text-center font-medium text-ink-950">{comparison.competitorName}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.featureRows.map((row) => (
                  <tr key={row.feature} className="border-b border-line">
                    <td className="p-4 text-slate-500">
                      {row.feature}
                      {row.note && <div className="mt-1 text-xs text-slate-400">{row.note}</div>}
                    </td>
                    <td className="p-4 text-center">{renderCell(row.leadPilot)}</td>
                    <td className="p-4 text-center">{renderCell(row.competitor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <FadeIn delay={0.15}>
            <div className="h-full rounded-xl border border-signal-500/30 bg-signal-500/5 p-6">
              <h2 className="font-display text-base font-semibold text-ink-950">Choose LeadPilot AI if...</h2>
              <ul className="mt-3 space-y-2">
                {comparison.whenToChooseLeadPilot.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-600" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="h-full rounded-xl border border-line bg-surface-2 p-6">
              <h2 className="font-display text-base font-semibold text-ink-950">
                Choose {comparison.competitorName} if...
              </h2>
              <ul className="mt-3 space-y-2">
                {comparison.whenToChooseCompetitor.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>

        {comparison.faqs.length > 0 && (
          <FadeIn delay={0.25}>
            <div className="mt-14">
              <h2 className="font-display text-xl font-semibold text-ink-950">FAQ</h2>
              <Accordion type="single" collapsible className="mt-4">
                {comparison.faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </FadeIn>
        )}

        <FadeIn delay={0.3}>
          <div className="mt-12 text-center">
            <Button size="lg" asChild>
              <Link href="/demo">See LeadPilot qualify a lead live</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
