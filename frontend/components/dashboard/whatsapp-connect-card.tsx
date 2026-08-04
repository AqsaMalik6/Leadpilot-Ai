"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { Integration } from "@/lib/schema";

const POLL_INTERVAL_MS = 2000;

type QrResponse = {
  status: string;
  qrCodeDataUrl: string | null;
  phoneNumber: string | null;
  lastStatusMessage?: string | null;
};

// SKILL-MULTI-TENANT-CONNECT.md §3 — separate from the generic IntegrationCard since
// this needs to poll for a QR code and render an image, not just a Connect button.
export function WhatsAppConnectCard({ integration }: { integration: Integration }) {
  const [state, setState] = useState<QrResponse>({
    status: integration.status,
    qrCodeDataUrl: null,
    phoneNumber: null,
  });
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function pollOnce() {
    const res = await fetch("/api/integrations/whatsapp/qr");
    if (!res.ok) return;
    const data: QrResponse = await res.json();
    setState(data);
    if (data.status === "connected" || data.status === "error") {
      stopPolling();
    }
  }

  useEffect(() => stopPolling, []);

  async function connect() {
    setBusy(true);
    const res = await fetch("/api/integrations/whatsapp/connect", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Couldn't start WhatsApp connect — is the connector service running?", variant: "destructive" });
      return;
    }
    setState((s) => ({ ...s, status: "qr_pending" }));
    stopPolling();
    pollRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
  }

  async function disconnect() {
    setBusy(true);
    const res = await fetch(`/api/integrations/${integration.id}`, { method: "DELETE" });
    setBusy(false);
    stopPolling();
    if (!res.ok) {
      toast({ title: "Failed to disconnect", variant: "destructive" });
      return;
    }
    setState({ status: "not_connected", qrCodeDataUrl: null, phoneNumber: null });
    toast({ title: "WhatsApp disconnected" });
  }

  const badgeVariant = state.status === "connected" ? "qualified" : state.status === "error" || state.status === "banned" ? "rejected" : "neutral";
  const badgeLabel =
    state.status === "connected" ? "Connected" : state.status === "qr_pending" ? "Scan QR" : state.status === "error" ? "Error" : state.status === "banned" ? "Banned" : "Not connected";

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-ink-950">{integration.label}</h3>
              <Badge variant={badgeVariant}>{badgeLabel}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {state.status === "connected" && state.phoneNumber ? `Connected: ${state.phoneNumber}` : integration.description}
            </p>
          </div>
          {state.status === "connected" ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" size="sm" disabled={busy} onClick={connect}>
              Connect WhatsApp
            </Button>
          )}
        </div>

        {state.status === "qr_pending" && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-surface-2 p-4">
            {state.qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a transient data: URL, not a static asset Next's image optimizer can process
              <img src={state.qrCodeDataUrl} alt="Scan with WhatsApp to link this number" className="h-48 w-48" />
            ) : (
              <p className="text-sm text-slate-500">Waiting for a QR code from the connector…</p>
            )}
            <p className="text-xs text-slate-500">Open WhatsApp on your phone → Linked devices → Link a device, then scan.</p>
          </div>
        )}

        {state.status === "error" && state.lastStatusMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{state.lastStatusMessage}</p>
        )}

        <p className="text-xs text-slate-500">
          This uses the same unofficial linked-device protocol WhatsApp Web itself uses — not Meta&apos;s official Business API. There&apos;s a
          real, if generally low at small scale, risk WhatsApp could restrict automated use of a linked device. Test with a spare number
          first, and never use this for bulk/broadcast messaging — only 1:1 replies to your real leads.
        </p>
      </CardContent>
    </Card>
  );
}
