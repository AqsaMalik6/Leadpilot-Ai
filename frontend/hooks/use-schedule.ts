"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScheduleEvent } from "@/lib/schema";

export function useScheduleEvents() {
  return useQuery<ScheduleEvent[]>({
    queryKey: ["schedule-events"],
    queryFn: async () => {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      return data.events;
    },
  });
}

export function useApproveScheduleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedule/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve");
      return data as { ok: true; leadId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead"] });
    },
  });
}

export function useRejectScheduleEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/schedule/${id}/reject`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
    },
  });
}
