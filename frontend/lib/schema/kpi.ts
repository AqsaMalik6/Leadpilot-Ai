import { z } from "zod";
import { LeadListItemSchema, LeadStatusSchema } from "./lead";

export const KpiSummarySchema = z.object({
  leadsToday: z.number(),
  leadsTodayDelta: z.number(),
  qualifiedToday: z.number(),
  qualifiedRate: z.number().min(0).max(1),
  bookedToday: z.number(),
  avgResponseTimeSeconds: z.number(),
  avgResponseTimeDelta: z.number(),
});
export type KpiSummary = z.infer<typeof KpiSummarySchema>;

export const KpiTimeseriesPointSchema = z.object({
  date: z.string(),
  newLeads: z.number(),
  qualified: z.number(),
  booked: z.number(),
  rejected: z.number(),
  avgResponseTimeSeconds: z.number(),
});
export type KpiTimeseriesPoint = z.infer<typeof KpiTimeseriesPointSchema>;

export const DashboardOverviewSchema = z.object({
  summary: KpiSummarySchema,
  timeseries: z.array(KpiTimeseriesPointSchema),
  recentLeads: z.array(LeadListItemSchema),
});
export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;

export const SseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("new_lead"), lead: LeadListItemSchema }),
  z.object({ type: z.literal("status_change"), leadId: z.string(), status: LeadStatusSchema }),
  z.object({ type: z.literal("heartbeat"), timestamp: z.string() }),
]);
export type SseEvent = z.infer<typeof SseEventSchema>;
