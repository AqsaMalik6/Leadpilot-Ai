import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd, siteConfig } from "@/lib/seo";
import { industriesFixture, getIndustryBySlug } from "@/lib/fixtures/industries";
import { getCaseStudyBySlug } from "@/lib/fixtures/testimonials";

export function generateStaticParams() {
  return industriesFixture.map((i) => ({ industry: i.slug }));
}

export function generateMetadata({ params }: { params: { industry: string } }): Metadata {
  const industry = getIndustryBySlug(params.industry);
  if (!industry) return {};
  return buildMetadata({
    title: industry.metaTitle,
    description: industry.metaDescription,
    path: `/solutions/${industry.slug}`,
  });
}

export default function IndustryPage({ params }: { params: { industry: string } }) {
  const industry = getIndustryBySlug(params.industry);
  if (!industry) notFound();

  const caseStudy = industry.caseStudySlug ? getCaseStudyBySlug(industry.caseStudySlug) : null;

  return (
    <div className="section-y">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Solutions", url: `${siteConfig.url}/product` },
          { name: industry.name, url: `${siteConfig.url}/solutions/${industry.slug}` },
        ])}
      />
      <JsonLd data={faqPageJsonLd(industry.faqs)} />

      <div className="container-lp max-w-3xl text-center">
        <FadeIn>
          <span className="text-xs font-medium uppercase tracking-wide text-signal-600">
            {industry.name}
          </span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            {industry.heroHeadline}
          </h1>
          <p className="mt-6 text-slate-500">{industry.heroSubhead}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/demo">
                Watch it qualify a lead <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/signup">Start free trial</Link>
            </Button>
          </div>
        </FadeIn>
      </div>

      <div className="container-lp mt-16 grid gap-6 md:grid-cols-3">
        {industry.painPoints.map((point, i) => (
          <FadeIn key={point.title} delay={i * 0.05}>
            <div className="h-full rounded-xl border border-line bg-surface p-6">
              <CheckCircle2 className="h-5 w-5 text-signal-600" />
              <h2 className="mt-3 font-display text-base font-semibold text-ink-950">{point.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{point.description}</p>
            </div>
          </FadeIn>
        ))}
      </div>

      {caseStudy && (
        <div className="container-lp mt-16">
          <FadeIn>
            <Link
              href={`/customers/${caseStudy.slug}`}
              className="block rounded-2xl border border-line bg-surface-2 p-8 transition-shadow hover:shadow-md"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Related walkthrough
              </span>
              <h2 className="mt-2 font-display text-xl font-semibold text-ink-950">{caseStudy.companyName}</h2>
              <p className="mt-2 text-sm text-slate-500">{caseStudy.summary}</p>
            </Link>
          </FadeIn>
        </div>
      )}

      <div className="container-lp mt-16 max-w-2xl">
        <FadeIn>
          <h2 className="font-display text-2xl font-bold text-ink-950">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-4">
            {industry.faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </div>
  );
}
