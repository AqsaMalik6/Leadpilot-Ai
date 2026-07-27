import Link from "next/link";
import { Check } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pricingTiersFixture } from "@/lib/fixtures/pricing";
import { formatCents } from "@/lib/utils";

export function PricingTeaser() {
  const tiers = pricingTiersFixture.slice(0, 3);

  return (
    <section className="section-y">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Simple, usage-based pricing
            </h2>
            <p className="mt-4 text-slate-500">Every plan starts with a free trial. No setup fees.</p>
          </div>
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <FadeIn key={tier.id} delay={i * 0.1}>
              <Card className={tier.highlighted ? "border-signal-500 shadow-lg ring-1 ring-signal-500" : "h-full"}>
                <CardHeader>
                  {tier.highlighted && (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-signal-500 px-2.5 py-0.5 text-xs font-medium text-ink-950">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-display text-xl font-semibold text-ink-950">{tier.name}</h3>
                  <p className="text-sm text-slate-500">{tier.tagline}</p>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl font-bold text-ink-950">
                    {formatCents(tier.monthlyPriceCents)}
                    {tier.monthlyPriceCents !== null && <span className="text-base font-normal text-slate-500">/mo</span>}
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {tier.featureBullets.slice(0, 4).map((feature) => (
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
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/pricing" className="text-sm font-medium text-signal-600 hover:underline">
            See full pricing & feature comparison →
          </Link>
        </div>
      </div>
    </section>
  );
}
