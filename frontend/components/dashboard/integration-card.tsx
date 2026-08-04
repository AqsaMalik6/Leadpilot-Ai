"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import type { Integration } from "@/lib/schema";

export function IntegrationCard({ integration }: { integration: Integration }) {
  const [status, setStatus] = useState(integration.status);
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [busy, setBusy] = useState(false);

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
            <Badge
              variant={
                status === "connected" ? "qualified" : status === "error" || status === "reconnect_needed" ? "rejected" : "neutral"
              }
            >
              {status === "connected"
                ? "Connected"
                : status === "reconnect_needed"
                  ? "Reconnect needed"
                  : status === "error"
                    ? "Error"
                    : "Not connected"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
          {integration.provider === "gmail" && status === "connected" && (
            <p className="mt-1 text-xs text-slate-400">
              {integration.lastSyncedAt ? `Last synced: ${new Date(integration.lastSyncedAt).toLocaleString()}` : "Not yet synced"}
            </p>
          )}
          {integration.provider === "gmail" && status === "reconnect_needed" && (
            <p className="mt-1 text-xs text-red-700">
              {integration.lastStatusMessage ?? "LeadPilot lost access to this inbox — reconnect to keep replying to real leads."}
            </p>
          )}
          {integration.provider === "gmail" && status === "not_connected" && (
            <p className="mt-1 text-xs text-slate-400">We only request read + send access. Encrypted. Revoke anytime.</p>
          )}
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
        ) : integration.provider === "gmail" ? (
          // Real top-level navigation, not a fetch — the eventual Google -> backend ->
          // here redirect chain only works as real browser navigations throughout.
          // Reconnecting re-runs the same /start flow — prompt=consent (gmail_connect.py)
          // always issues a fresh refresh_token, which is exactly what a dead one needs.
          <Button variant="primary" size="sm" onClick={() => { window.location.href = "/api/integrations/gmail/connect"; }}>
            {status === "reconnect_needed" ? "Reconnect Gmail" : "Connect Gmail"}
          </Button>
        ) : (
          integration.provider !== "calendly" && (
            <Button variant="primary" size="sm">
              Connect
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
