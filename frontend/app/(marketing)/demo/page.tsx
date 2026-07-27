import type { Metadata } from "next";
import { LiveDemoWidget } from "@/components/marketing/demo/live-demo-widget";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";
import { Info } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Live Demo — Watch LeadPilot Qualify a Lead",
  description:
    "Submit a fake lead and watch LeadPilot's AI SDR reply, ask qualifying questions, and book a call or close politely — live.",
  path: "/demo",
});

export default function DemoPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-4xl">
        <FadeIn>
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
              Watch LeadPilot qualify a lead — live
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-slate-500">
              Fill in the form below with a realistic inquiry — mention a home, an urgent repair, or
              a software trial — and see how the qualifying conversation adapts.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This is a scripted simulation, not a live LLM call — it demonstrates the exact
              conversation flow LeadPilot runs on real inbound leads. Nothing you submit here is
              stored or sent anywhere.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-8">
            <LiveDemoWidget variant="full" />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
