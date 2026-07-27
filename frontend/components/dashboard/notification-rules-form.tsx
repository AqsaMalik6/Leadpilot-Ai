"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

const RULES = [
  { id: "new_lead", label: "New lead received", description: "Fire the moment a new conversation starts." },
  { id: "qualified", label: "Lead qualified", description: "Fire when a lead clears your handoff threshold." },
  { id: "booked", label: "Call booked", description: "Fire when a lead books a call via Calendly." },
  { id: "rejected", label: "Lead rejected", description: "Fire when LeadPilot closes an unqualified conversation." },
];

const DEFAULT_SLACK = { new_lead: true, qualified: true, booked: true, rejected: false };
const DEFAULT_EMAIL = { new_lead: false, qualified: true, booked: true, rejected: false };

export function NotificationRulesForm({ initialRules }: { initialRules?: Record<string, Record<string, boolean>> }) {
  const [slack, setSlack] = useState<Record<string, boolean>>({ ...DEFAULT_SLACK, ...initialRules?.slack });
  const [email, setEmail] = useState<Record<string, boolean>>({ ...DEFAULT_EMAIL, ...initialRules?.email });
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setSubmitting(true);
    const res = await fetch("/api/notifications/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slack, email }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast({ title: "Failed to save notification rules", variant: "destructive" });
      return;
    }
    toast({ title: "Notification rules saved" });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-4">Event</th>
                <th className="p-4 text-center">Slack</th>
                <th className="p-4 text-center">Email</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((rule) => (
                <tr key={rule.id} className="border-b border-line last:border-0">
                  <td className="p-4">
                    <div className="font-medium text-ink-950">{rule.label}</div>
                    <div className="text-xs text-slate-500">{rule.description}</div>
                  </td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={slack[rule.id]}
                      onCheckedChange={(v) => setSlack((s) => ({ ...s, [rule.id]: v }))}
                    />
                  </td>
                  <td className="p-4 text-center">
                    <Switch
                      checked={email[rule.id]}
                      onCheckedChange={(v) => setEmail((s) => ({ ...s, [rule.id]: v }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Button onClick={save} disabled={submitting}>
        Save notification rules
      </Button>
      <p className="text-xs text-slate-500">
        Email toggles are enforced live — turning off &ldquo;Lead qualified&rdquo; here really stops that email.
        Slack toggles are saved but not enforced yet since Slack isn&apos;t connected (see Integrations).
      </p>
    </div>
  );
}
