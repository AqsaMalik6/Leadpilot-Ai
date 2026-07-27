import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { LiveDemoWidget } from "@/components/marketing/demo/live-demo-widget";

export function DemoSection() {
  return (
    <section className="section-y">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Watch LeadPilot qualify a lead — right now
            </h2>
            <p className="mt-4 text-slate-500">
              Submit a fake lead below and watch the exact conversation flow LeadPilot runs on real
              inbound leads.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mt-12">
            <LiveDemoWidget variant="embedded" />
          </div>
        </FadeIn>
        <div className="mt-8 text-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1 text-sm font-medium text-signal-600 hover:underline"
          >
            Try more scenarios on the full demo page <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
