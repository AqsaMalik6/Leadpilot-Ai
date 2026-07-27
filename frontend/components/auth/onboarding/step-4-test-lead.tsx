import { LiveDemoWidget } from "@/components/marketing/demo/live-demo-widget";

export function Step4TestLead() {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink-950">Send a test lead</h2>
      <p className="mt-1 text-sm text-slate-500">
        Confirm everything works before you go live — submit a test lead and watch LeadPilot
        qualify it end to end, for real.
      </p>
      <div className="mt-6">
        <LiveDemoWidget variant="full" mode="onboarding" />
      </div>
    </div>
  );
}
