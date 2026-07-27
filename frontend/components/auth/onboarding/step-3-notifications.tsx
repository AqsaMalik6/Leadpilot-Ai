"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function Step3Notifications({
  calendlyUrl,
  onCalendlyChange,
  slackEnabled,
  onSlackChange,
  emailEnabled,
  onEmailChange,
}: {
  calendlyUrl: string;
  onCalendlyChange: (value: string) => void;
  slackEnabled: boolean;
  onSlackChange: (value: boolean) => void;
  emailEnabled: boolean;
  onEmailChange: (value: boolean) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink-950">Connect Calendly & alerts</h2>
      <p className="mt-1 text-sm text-slate-500">
        Qualified leads get booked here, and your team gets notified the moment it happens.
      </p>
      <div className="mt-6 space-y-5">
        <div>
          <Label htmlFor="calendly-url">Calendly booking link</Label>
          <Input
            id="calendly-url"
            className="mt-1.5"
            placeholder="https://calendly.com/your-team"
            value={calendlyUrl}
            onChange={(e) => onCalendlyChange(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line p-4">
          <div>
            <div className="text-sm font-medium text-ink-950">Slack notifications</div>
            <div className="text-xs text-slate-500">Alert #sales the moment a lead is qualified or booked.</div>
          </div>
          <Switch checked={slackEnabled} onCheckedChange={onSlackChange} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line p-4">
          <div>
            <div className="text-sm font-medium text-ink-950">Email notifications</div>
            <div className="text-xs text-slate-500">Send a summary email for every qualified lead.</div>
          </div>
          <Switch checked={emailEnabled} onCheckedChange={onEmailChange} />
        </div>
      </div>
    </div>
  );
}
