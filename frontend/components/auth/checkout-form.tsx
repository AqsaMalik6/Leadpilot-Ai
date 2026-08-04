"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";
import type { PricingTier } from "@/lib/schema";

// Dummy billing only — there is no real Stripe account behind this product, so
// there's no real card form here either. This still writes a real plan onto the
// org via POST /api/billing/checkout (app/routers/billing.py's dummy_checkout) —
// the plan selection itself is real, just not the payment network behind it.
export function CheckoutForm({ tier }: { tier: PricingTier }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: tier.id }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Something went wrong confirming your plan. Please try again.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <Card className="relative z-10 w-full max-w-md">
      <CardHeader>
        <h1 className="font-display text-2xl font-bold text-ink-950">Confirm your plan</h1>
        <p className="text-sm text-slate-500">No credit card required during setup — billing goes live once you&apos;re ready.</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-signal-500/40 bg-signal-500/5 p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg font-semibold text-ink-950">{tier.name}</span>
            <span className="text-sm text-slate-500">
              {tier.monthlyPriceCents !== null ? (
                <>
                  <span className="text-xl font-bold text-ink-950">{formatCents(tier.monthlyPriceCents)}</span>/mo
                </>
              ) : (
                "Custom"
              )}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{tier.tagline}</p>
          <ul className="mt-4 space-y-2">
            {tier.featureBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-ink-950">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-600" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}

        <Button className="mt-6 w-full" disabled={busy} onClick={confirm}>
          {busy ? "Confirming…" : "Confirm & continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
