"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { offerJsonLd } from "@/lib/seo";
import { pricingTiersFixture } from "@/lib/fixtures/pricing";
import { getFaqsByCategory } from "@/lib/fixtures/faqs";
import { formatCents } from "@/lib/utils";

const COMPARISON_FEATURES: { feature: string; values: Record<string, boolean | string> }[] = [
  { feature: "Website form intake", values: { starter: true, growth: true, scale: true, enterprise: true } },
  { feature: "WhatsApp + email intake", values: { starter: false, growth: true, scale: true, enterprise: true } },
  { feature: "Custom qualifying questions", values: { starter: "Limited", growth: true, scale: true, enterprise: true } },
  { feature: "CRM integration (HubSpot)", values: { starter: false, growth: true, scale: true, enterprise: true } },
  { feature: "Multiple agent personas", values: { starter: false, growth: false, scale: true, enterprise: true } },
  { feature: "Team roles & permissions", values: { starter: false, growth: false, scale: true, enterprise: true } },
  { feature: "Dedicated success manager", values: { starter: false, growth: false, scale: false, enterprise: true } },
];

function renderValue(value: boolean | string) {
  if (typeof value === "string") return <span className="text-sm text-ink-950">{value}</span>;
  return value ? (
    <Check className="mx-auto h-4 w-4 text-signal-600" />
  ) : (
    <X className="mx-auto h-4 w-4 text-slate-300" />
  );
}

export function PricingPageContent() {
  const [annual, setAnnual] = useState(false);
  const billingFaqs = getFaqsByCategory("pricing");

  return (
    <div className="section-y">
      <JsonLd data={offerJsonLd(pricingTiersFixture.map((t) => ({ name: t.name, priceCents: t.monthlyPriceCents })))} />
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              Simple pricing that scales with your lead volume
            </h1>
            <p className="mt-4 text-slate-500">
              Every plan includes a free trial with no setup fee. Upgrade or downgrade any time.
            </p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2">
              <span className={`text-sm ${!annual ? "font-semibold text-ink-950" : "text-slate-500"}`}>Monthly</span>
              <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Toggle annual billing" />
              <span className={`text-sm ${annual ? "font-semibold text-ink-950" : "text-slate-500"}`}>
                Annual <span className="text-signal-600">(2 months free)</span>
              </span>
            </div>
          </div>
        </FadeIn>

        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {pricingTiersFixture.map((tier, i) => {
            const price = annual ? tier.annualPriceCents : tier.monthlyPriceCents;
            const displayPrice = annual && price !== null ? Math.round(price / 12) : price;
            return (
              <FadeIn key={tier.id} delay={i * 0.05}>
                <Card
                  className={
                    tier.highlighted ? "h-full border-signal-500 shadow-lg ring-1 ring-signal-500" : "h-full"
                  }
                >
                  <CardHeader>
                    {tier.highlighted && (
                      <span className="mb-2 inline-flex w-fit rounded-full bg-signal-500 px-2.5 py-0.5 text-xs font-medium text-ink-950">
                        Most popular
                      </span>
                    )}
                    <h2 className="font-display text-xl font-semibold text-ink-950">{tier.name}</h2>
                    <p className="text-sm text-slate-500">{tier.tagline}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="font-display text-3xl font-bold text-ink-950">
                      {formatCents(displayPrice)}
                      {displayPrice !== null && <span className="text-base font-normal text-slate-500">/mo</span>}
                    </div>
                    {tier.leadsIncludedPerMonth && (
                      <p className="mt-1 text-xs text-slate-500">
                        {tier.leadsIncludedPerMonth.toLocaleString()} leads/mo included
                      </p>
                    )}
                    <ul className="mt-6 space-y-2.5">
                      {tier.featureBullets.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-slate-500">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-600" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="mt-6 w-full" variant={tier.highlighted ? "primary" : "outline"}>
                      <Link href={tier.ctaHref}>{tier.ctaLabel}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={0.2}>
          <div className="mt-20 overflow-x-auto">
            <h2 className="mb-6 text-center font-display text-2xl font-bold text-ink-950">
              Full feature comparison
            </h2>
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-3 text-left font-medium text-slate-500">Feature</th>
                  {pricingTiersFixture.map((tier) => (
                    <th key={tier.id} className="py-3 text-center font-medium text-ink-950">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row) => (
                  <tr key={row.feature} className="border-b border-line">
                    <td className="py-3 text-slate-500">{row.feature}</td>
                    {pricingTiersFixture.map((tier) => (
                      <td key={tier.id} className="py-3 text-center">
                        {renderValue(row.values[tier.id] ?? false)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>

      <div className="mt-8">
        <FaqAccordion items={billingFaqs} title="Billing questions" />
      </div>
    </div>
  );
}
