import { backendFetch } from "@/lib/backend-fetch";
import { IntegrationSchema, type Integration } from "@/lib/schema";

export async function getIntegrations(): Promise<Integration[]> {
  const res = await backendFetch("/api/integrations");
  if (!res.ok) throw new Error(`Failed to load integrations (${res.status})`);
  const data = await res.json();
  return IntegrationSchema.array().parse(data.integrations);
}
