import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/shared/fade-in";

export function CtaSection() {
  return (
    <section className="section-y bg-ink-950 text-white">
      <div className="container-lp text-center">
        <FadeIn>
          <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Stop losing leads to slow replies
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/70">
            Connect your first lead channel and watch LeadPilot qualify a real conversation in
            minutes.
          </p>
          <Button size="lg" asChild className="mt-8">
            <Link href="/signup">
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </FadeIn>
      </div>
    </section>
  );
}
