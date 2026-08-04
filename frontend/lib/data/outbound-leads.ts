import { backendFetch } from "@/lib/backend-fetch";
import { OutboundLeadSchema, type OutboundLead } from "@/lib/schema";

export async function getOutboundLeads(): Promise<OutboundLead[]> {
  const res = await backendFetch("/api/integrations/outbound-leads");
  if (!res.ok) throw new Error(`Failed to load outbound leads (${res.status})`);
  const data = await res.json();
  return OutboundLeadSchema.array().parse(data.leads);
}

export async function searchOutboundLeads(category: string, location: string, maxResults: number): Promise<OutboundLead[]> {
  const res = await backendFetch("/api/integrations/outbound-leads/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, location, maxResults }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Search failed (${res.status})`);
  }
  const data = await res.json();
  return OutboundLeadSchema.array().parse(data.leads);
}

export async function deleteOutboundLead(id: string): Promise<void> {
  const res = await backendFetch(`/api/integrations/outbound-leads/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete outbound lead ${id} (${res.status})`);
}

export async function addOutboundLeadsToCampaign(leadIds: string[]): Promise<{ added: number }> {
  const res = await backendFetch("/api/integrations/outbound-leads/add-to-campaign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to add leads to campaign (${res.status})`);
  }
  return res.json();
}
