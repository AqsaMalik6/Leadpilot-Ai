import { Clock, DollarSign, Snowflake } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent } from "@/components/ui/card";

const STATS = [
  {
    icon: Clock,
    value: "6–24 hrs",
    label: "Average human response time to a new inbound lead",
    note: "Illustrative industry range",
  },
  {
    icon: DollarSign,
    value: "$3–5k/mo",
    label: "Fully-loaded cost of a single human SDR",
    note: "Illustrative — varies by market",
  },
  {
    icon: Snowflake,
    value: "~80%",
    label: "Of leads go cold within the first 5 minutes of waiting",
    note: "Illustrative — response-time studies vary",
  },
];

export function ProblemStats() {
  return (
    <section className="section-y">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Slow replies are a silent revenue leak
            </h2>
            <p className="mt-4 text-slate-500">
              Every hour a lead waits is an hour a faster competitor has to win them instead.
            </p>
          </div>
        </FadeIn>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1}>
              <Card className="h-full">
                <CardContent className="pt-6">
                  <stat.icon className="h-6 w-6 text-signal-600" />
                  <div className="mt-4 font-display text-3xl font-bold text-ink-950">{stat.value}</div>
                  <p className="mt-2 text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-xs text-slate-400">{stat.note}</p>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
