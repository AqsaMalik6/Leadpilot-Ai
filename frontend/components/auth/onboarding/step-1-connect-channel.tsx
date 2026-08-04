"use client";

import { useEffect, useState } from "react";
import { IntegrationCard } from "@/components/dashboard/integration-card";
import { WhatsAppConnectCard } from "@/components/dashboard/whatsapp-connect-card";
import { Switch } from "@/components/ui/switch";
import type { Integration } from "@/lib/schema";

export function Step1ConnectChannel({
  gmailReplyMode,
  onGmailReplyModeChange,
}: {
  gmailReplyMode: "auto_send" | "review_first";
  onGmailReplyModeChange: (mode: "auto_send" | "review_first") => void;
}) {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((res) => res.json())
      .then((data) => setIntegrations(data.integrations ?? []))
      .catch(() => setIntegrations([]));
  }, []);

  const gmail = integrations?.find((i) => i.provider === "gmail");
  const whatsapp = integrations?.find((i) => i.provider === "whatsapp_qr");

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-ink-950">Connect your first lead channel</h2>
      <p className="mt-1 text-sm text-slate-500">
        Connect as many as you want — none are required to continue, and you can always add more later from Dashboard → Integrations.
      </p>
      <div className="mt-6 space-y-4">
        {gmail && <IntegrationCard integration={gmail} />}
        {gmail?.status === "connected" && (
          <div className="flex items-center justify-between rounded-lg border border-line p-4">
            <div>
              <div className="text-sm font-medium text-ink-950">Review Gmail replies before they send</div>
              <div className="text-xs text-slate-500">
                Off: replies send automatically. On: each draft waits in Dashboard → Integrations for your approval first.
              </div>
            </div>
            <Switch
              checked={gmailReplyMode === "review_first"}
              onCheckedChange={(checked) => onGmailReplyModeChange(checked ? "review_first" : "auto_send")}
            />
          </div>
        )}
        {whatsapp && <WhatsAppConnectCard integration={whatsapp} />}
      </div>
    </div>
  );
}
