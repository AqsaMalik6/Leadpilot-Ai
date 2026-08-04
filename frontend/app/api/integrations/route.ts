import { NextResponse } from "next/server";
import { getIntegrations } from "@/lib/data/integrations";

// The dashboard's own /dashboard/integrations page is a Server Component and calls
// getIntegrations() directly, so it never needed this route. Client components that
// need the same merged list (e.g. onboarding's Step1ConnectChannel, which renders
// the same IntegrationCard/WhatsAppConnectCard used on the dashboard) fetch this
// instead — same data layer, just reachable from client-side code too.
export async function GET() {
  const integrations = await getIntegrations();
  return NextResponse.json({ integrations });
}
