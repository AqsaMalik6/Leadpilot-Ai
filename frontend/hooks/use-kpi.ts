"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardOverview } from "@/lib/schema";

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/overview");
      return res.json();
    },
  });
}
