"use client";

import { RotateCcw, Sparkles, Loader2 } from "lucide-react";
import { DemoLeadForm } from "@/components/marketing/demo/demo-lead-form";
import { LiveTranscript } from "@/components/shared/live-transcript";
import { StatusDot } from "@/components/shared/status-dot";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { useLiveLead } from "@/hooks/use-live-lead";
import type { DemoLeadInput, Lead } from "@/lib/schema";

interface LiveDemoWidgetProps {
  variant?: "full" | "embedded";
  /** "public" hits the unauthenticated demo-sandbox endpoints (marketing /demo
   * page); "onboarding" hits the org-authenticated endpoints so the test lead
   * runs against the org's own real agent_configs row. */
  mode?: "public" | "onboarding";
}

export function LiveDemoWidget({ variant = "full", mode = "public" }: LiveDemoWidgetProps) {
  const { lead, status, start, reset } = useLiveLead();

  async function handleSubmit(input: DemoLeadInput) {
    const submitPath = mode === "onboarding" ? "/api/onboarding/test-lead" : "/api/demo/lead";
    const res = await fetch(submitPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return;
    const data = await res.json();
    const leadId = data.leadId;
    if (!leadId) return;

    const fetchPath = mode === "onboarding" ? `/api/leads/${leadId}` : `/api/demo/lead/${leadId}`;
    start(async (): Promise<Lead | null> => {
      const pollRes = await fetch(fetchPath, { cache: "no-store" });
      if (!pollRes.ok) return null;
      const pollData = await pollRes.json();
      return pollData.lead ?? null;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Sparkles className="h-4 w-4 text-signal-500" />
          {mode === "onboarding" ? "Send a test lead" : "Submit a sample lead"}
        </div>
        <DemoLeadForm
          onSubmit={handleSubmit}
          submitting={status === "waiting"}
          submitLabel={mode === "onboarding" ? "Send test lead" : undefined}
        />
        <p className="mt-4 text-xs text-slate-500">
          {mode === "onboarding"
            ? "This is a real lead run through your agent's live configuration — nothing is faked."
            : "This is a real, live call to LeadPilot's Groq-powered agent against a sandbox account — the same pipeline that runs for real customers."}
        </p>
      </div>

      <div className={variant === "embedded" ? "rounded-2xl bg-ink-950 p-5" : "rounded-2xl border border-line bg-surface-2 p-5"}>
        <div className="mb-3 flex items-center justify-between">
          <StatusDot live={status === "waiting"} />
          {lead && status === "done" && <StatusBadge status={lead.status} />}
          {(status === "waiting" || status === "done") && (
            <Button variant="ghost" size="sm" onClick={reset} className={variant === "embedded" ? "text-white/70 hover:bg-white/10" : ""}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>
        <div className={variant === "embedded" ? "h-80" : "h-96"}>
          {!lead || lead.transcript.length === 0 ? (
            <div className={`flex h-full flex-col items-center justify-center gap-2 text-center text-sm ${variant === "embedded" ? "text-white/50" : "text-slate-500"}`}>
              {status === "waiting" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Waiting for the agent&apos;s reply…
                </>
              ) : status === "error" ? (
                "The agent didn't respond in time — try again."
              ) : (
                "Fill out the form to watch LeadPilot qualify a lead in real time."
              )}
            </div>
          ) : (
            <LiveTranscript messages={lead.transcript} autoPlay={false} className="h-full" />
          )}
        </div>
      </div>
    </div>
  );
}
