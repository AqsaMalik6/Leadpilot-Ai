import { Quote } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { testimonialsFixture } from "@/lib/fixtures/testimonials";

export function SocialProofCarousel() {
  return (
    <section className="section-y bg-surface-2">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              What this looks like for a team like yours
            </h2>
            <p className="mt-4 text-slate-500">
              LeadPilot AI is early — these are modeled, illustrative scenarios based on typical
              response-time and qualification patterns, not paid endorsements.{" "}
              <span className="font-medium text-ink-950">We&apos;ll replace these with real customer
              stories the moment we have them.</span>
            </p>
          </div>
        </FadeIn>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonialsFixture.map((testimonial, i) => (
            <FadeIn key={testimonial.id} delay={i * 0.1}>
              <Card className="flex h-full flex-col">
                <CardContent className="flex flex-1 flex-col pt-6">
                  <Quote className="h-6 w-6 text-signal-500/40" />
                  <p className="mt-4 flex-1 text-sm text-ink-950">{testimonial.quote}</p>
                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink-950">{testimonial.companyName}</div>
                      <div className="text-xs text-slate-500">{testimonial.authorTitle}</div>
                    </div>
                    {testimonial.metricCallout && (
                      <span className="font-display text-sm font-bold text-signal-600">
                        {testimonial.metricCallout}
                      </span>
                    )}
                  </div>
                  {testimonial.isIllustrative && (
                    <Badge variant="neutral" className="mt-4 self-start">
                      Illustrative example
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
