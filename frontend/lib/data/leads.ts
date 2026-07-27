import { backendFetch } from "@/lib/backend-fetch";
import {
  AgentActionSchema,
  LeadSchema,
  LeadListItemSchema,
  ProposalSchema,
  type AgentAction,
  type Lead,
  type LeadFilters,
  type LeadListItem,
  type LeadStatus,
  type Outcome,
  type Proposal,
} from "@/lib/schema";

export async function getLeads(filters: LeadFilters = {}): Promise<LeadListItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();

  const res = await backendFetch(`/api/leads${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to load leads (${res.status})`);
  const data = await res.json();
  return LeadListItemSchema.array().parse(data.leads);
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const res = await backendFetch(`/api/leads/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load lead ${id} (${res.status})`);
  const data = await res.json();
  return LeadSchema.parse(data.lead);
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<{ ok: true }> {
  const res = await backendFetch(`/api/leads/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update lead ${id} status (${res.status})`);
  return { ok: true };
}

// SKILL-DIGITAL-FTE-UPGRADE.md §7 — backs the dashboard's AI reasoning feed.
export async function getLeadActions(id: string): Promise<AgentAction[]> {
  const res = await backendFetch(`/api/leads/${id}/actions`);
  if (!res.ok) throw new Error(`Failed to load actions for lead ${id} (${res.status})`);
  const data = await res.json();
  return AgentActionSchema.array().parse(data.actions);
}

// Post-meeting flow: AI drafts -> manager approves & sends -> mark won/lost.
export async function getProposal(id: string): Promise<Proposal | null> {
  const res = await backendFetch(`/api/leads/${id}/proposal`);
  if (!res.ok) throw new Error(`Failed to load proposal for lead ${id} (${res.status})`);
  const data = await res.json();
  return data.proposal ? ProposalSchema.parse(data.proposal) : null;
}

export async function generateProposal(id: string): Promise<Proposal> {
  const res = await backendFetch(`/api/leads/${id}/proposal/generate`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to generate proposal for lead ${id} (${res.status})`);
  const data = await res.json();
  return ProposalSchema.parse(data.proposal);
}

export async function editProposal(id: string, edits: { subject?: string; body?: string }): Promise<Proposal> {
  const res = await backendFetch(`/api/leads/${id}/proposal`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edits),
  });
  if (!res.ok) throw new Error(`Failed to save proposal edits for lead ${id} (${res.status})`);
  const data = await res.json();
  return ProposalSchema.parse(data.proposal);
}

export async function approveProposal(id: string): Promise<{ ok: true; sent: boolean; proposal: Proposal }> {
  const res = await backendFetch(`/api/leads/${id}/proposal/approve`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to approve proposal for lead ${id} (${res.status})`);
  const data = await res.json();
  return { ok: true, sent: data.sent, proposal: ProposalSchema.parse(data.proposal) };
}

export async function setLeadOutcome(id: string, outcome: Outcome, reason?: string): Promise<{ ok: true }> {
  const res = await backendFetch(`/api/leads/${id}/outcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome, reason }),
  });
  if (!res.ok) throw new Error(`Failed to set outcome for lead ${id} (${res.status})`);
  return { ok: true };
}
