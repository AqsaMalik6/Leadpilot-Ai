"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import type { Integration } from "@/lib/schema";

const PHASE_2_PROVIDERS = new Set(["slack", "hubspot"]);

export function IntegrationCard({ integration }: { integration: Integration }) {
  const [status, setStatus] = useState(integration.status);
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const isPhase2 = PHASE_2_PROVIDERS.has(integration.provider);

  async function disconnect() {
    setBusy(true);
    const res = await fetch(`/api/integrations/${integration.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Failed to disconnect", variant: "destructive" });
      return;
    }
    setStatus("not_connected");
    toast({ title: `${integration.label} disconnected` });
  }

  async function connectCalendly() {
    if (!calendlyUrl) return;
    setBusy(true);
    const res = await fetch("/api/integrations/calendly/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendlyUrl }),
    });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Failed to connect Calendly — check the URL", variant: "destructive" });
      return;
    }
    setStatus("connected");
    toast({ title: "Calendly connected" });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-ink-950">{integration.label}</h3>
            <Badge variant={status === "connected" ? "qualified" : status === "error" ? "rejected" : "neutral"}>
              {status === "connected" ? "Connected" : status === "error" ? "Error" : isPhase2 ? "Coming soon" : "Not connected"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
          {status !== "connected" && integration.provider === "calendly" && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                placeholder="https://calendly.com/your-team"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
                className="h-9"
              />
              <Button size="sm" disabled={busy || !calendlyUrl} onClick={connectCalendly}>
                Connect
              </Button>
            </div>
          )}
        </div>
        {status === "connected" ? (
          <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>
            Disconnect
          </Button>
        ) : (
          integration.provider !== "calendly" && (
            <Button variant="primary" size="sm" disabled={isPhase2} title={isPhase2 ? "Coming in a later phase" : undefined}>
              Connect
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
