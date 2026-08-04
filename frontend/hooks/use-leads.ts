"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentAction, Lead, LeadFilters, LeadListItem, LeadStatus, Outcome, Proposal } from "@/lib/schema";

function buildQuery(filters: LeadFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useLeads(filters: LeadFilters = {}) {
  return useQuery<LeadListItem[]>({
    queryKey: ["leads", filters],
    queryFn: async () => {
      const res = await fetch(`/api/leads${buildQuery(filters)}`);
      const data = await res.json();
      return data.leads;
    },
  });
}

export function useLead(id: string) {
  return useQuery<Lead>({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}`);
      const data = await res.json();
      return data.lead;
    },
  });
}

export function useLeadActions(id: string) {
  return useQuery<AgentAction[]>({
    queryKey: ["lead-actions", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}/actions`);
      const data = await res.json();
      return data.actions;
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete lead");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      await fetch(`/api/leads/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
      queryClient.invalidateQueries({ queryKey: ["lead-actions"] });
    },
  });
}

export function useProposal(id: string) {
  return useQuery<Proposal | null>({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${id}/proposal`);
      const data = await res.json();
      return data.proposal;
    },
  });
}

function useInvalidateLead(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["lead", id] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead-actions", id] });
    queryClient.invalidateQueries({ queryKey: ["proposal", id] });
  };
}

export function useGenerateProposal(id: string) {
  const invalidate = useInvalidateLead(id);
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${id}/proposal/generate`, { method: "POST" });
      const data = await res.json();
      return data.proposal as Proposal;
    },
    onSuccess: invalidate,
  });
}

export function useEditProposal(id: string) {
  const invalidate = useInvalidateLead(id);
  return useMutation({
    mutationFn: async (edits: { subject?: string; body?: string }) => {
      const res = await fetch(`/api/leads/${id}/proposal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      const data = await res.json();
      return data.proposal as Proposal;
    },
    onSuccess: invalidate,
  });
}

export function useApproveProposal(id: string) {
  const invalidate = useInvalidateLead(id);
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${id}/proposal/approve`, { method: "POST" });
      return res.json();
    },
    onSuccess: invalidate,
  });
}

export function useSetLeadOutcome(id: string) {
  const invalidate = useInvalidateLead(id);
  return useMutation({
    mutationFn: async ({ outcome, reason }: { outcome: Outcome; reason?: string }) => {
      await fetch(`/api/leads/${id}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, reason }),
      });
    },
    onSuccess: invalidate,
  });
}

export function useSetMeetingTranscript(id: string) {
  const invalidate = useInvalidateLead(id);
  return useMutation({
    mutationFn: async (transcript: string) => {
      await fetch(`/api/leads/${id}/meeting-transcript`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
    },
    onSuccess: invalidate,
  });
}
