import { backendFetch } from "@/lib/backend-fetch";
import { DashboardOverviewSchema, type DashboardOverview } from "@/lib/schema";

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const res = await backendFetch("/api/dashboard/overview");
  if (!res.ok) throw new Error(`Failed to load dashboard overview (${res.status})`);
  return DashboardOverviewSchema.parse(await res.json());
}
