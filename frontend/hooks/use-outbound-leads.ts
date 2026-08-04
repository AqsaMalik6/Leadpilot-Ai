"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OutboundLead } from "@/lib/schema";

export function useOutboundLeads() {
  return useQuery<OutboundLead[]>({
    queryKey: ["outbound-leads"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/outbound-leads");
      const data = await res.json();
      return data.leads;
    },
  });
}

export function useOutboundSearch() {
  const queryClient = useQueryClient();
  return useMutation<OutboundLead[], Error, { category: string; location: string; maxResults: number }>({
    mutationFn: async ({ category, location, maxResults }) => {
      const res = await fetch("/api/integrations/outbound-leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, location, maxResults }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");
      return data.leads;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-leads"] });
    },
  });
}

export function useDeleteOutboundLead() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(`/api/integrations/outbound-leads/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete outbound lead");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-leads"] });
    },
  });
}

export function useAddToCampaign() {
  const queryClient = useQueryClient();
  return useMutation<{ added: number }, Error, { leadIds: string[] }>({
    mutationFn: async ({ leadIds }) => {
      const res = await fetch("/api/integrations/outbound-leads/add-to-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Add to campaign failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound-leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
