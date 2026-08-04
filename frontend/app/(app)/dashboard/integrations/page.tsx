import { IntegrationCard } from "@/components/dashboard/integration-card";
import { WhatsAppConnectCard } from "@/components/dashboard/whatsapp-connect-card";
import { GmailPendingRepliesPanel } from "@/components/dashboard/gmail-pending-replies-panel";
import { getIntegrations } from "@/lib/data/integrations";

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Integrations</h1>
        <p className="text-sm text-slate-500">Connect the channels and tools LeadPilot uses to reply and hand off leads.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) =>
          integration.provider === "whatsapp_qr" ? (
            <WhatsAppConnectCard key={integration.id} integration={integration} />
          ) : (
            <IntegrationCard key={integration.id} integration={integration} />
          )
        )}
      </div>
      <GmailPendingRepliesPanel />
    </div>
  );
}
