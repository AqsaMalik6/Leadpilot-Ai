import {
  DashboardOverviewSchema,
  KpiTimeseriesPointSchema,
  type DashboardOverview,
  type KpiTimeseriesPoint,
} from "@/lib/schema";
import { leadsFixture } from "./leads";
import { LeadListItemSchema } from "@/lib/schema";

// Precomputed literal 30-day series ending 2026-07-21 — intentionally NOT generated with
// Math.random()/Date.now() at import time, so SSR and CSR always render identical numbers
// (see SKILL-FRONTEND.md §4.2).
const timeseriesRaw: KpiTimeseriesPoint[] = [
  { date: "2026-06-22", newLeads: 18, qualified: 11, booked: 4, rejected: 3, avgResponseTimeSeconds: 9 },
  { date: "2026-06-23", newLeads: 21, qualified: 13, booked: 5, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-06-24", newLeads: 25, qualified: 16, booked: 6, rejected: 3, avgResponseTimeSeconds: 9 },
  { date: "2026-06-25", newLeads: 23, qualified: 14, booked: 5, rejected: 4, avgResponseTimeSeconds: 8 },
  { date: "2026-06-26", newLeads: 27, qualified: 17, booked: 7, rejected: 3, avgResponseTimeSeconds: 7 },
  { date: "2026-06-27", newLeads: 14, qualified: 9, booked: 3, rejected: 2, avgResponseTimeSeconds: 9 },
  { date: "2026-06-28", newLeads: 11, qualified: 7, booked: 2, rejected: 2, avgResponseTimeSeconds: 10 },
  { date: "2026-06-29", newLeads: 24, qualified: 15, booked: 6, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-06-30", newLeads: 26, qualified: 17, booked: 6, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-07-01", newLeads: 29, qualified: 19, booked: 8, rejected: 2, avgResponseTimeSeconds: 7 },
  { date: "2026-07-02", newLeads: 28, qualified: 18, booked: 7, rejected: 3, avgResponseTimeSeconds: 7 },
  { date: "2026-07-03", newLeads: 22, qualified: 14, booked: 5, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-07-04", newLeads: 9, qualified: 5, booked: 1, rejected: 3, avgResponseTimeSeconds: 11 },
  { date: "2026-07-05", newLeads: 12, qualified: 8, booked: 3, rejected: 1, avgResponseTimeSeconds: 10 },
  { date: "2026-07-06", newLeads: 27, qualified: 18, booked: 7, rejected: 2, avgResponseTimeSeconds: 8 },
  { date: "2026-07-07", newLeads: 31, qualified: 21, booked: 9, rejected: 2, avgResponseTimeSeconds: 7 },
  { date: "2026-07-08", newLeads: 30, qualified: 20, booked: 8, rejected: 2, avgResponseTimeSeconds: 7 },
  { date: "2026-07-09", newLeads: 26, qualified: 17, booked: 6, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-07-10", newLeads: 24, qualified: 15, booked: 6, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-07-11", newLeads: 13, qualified: 8, booked: 3, rejected: 2, avgResponseTimeSeconds: 10 },
  { date: "2026-07-12", newLeads: 10, qualified: 6, booked: 2, rejected: 2, avgResponseTimeSeconds: 11 },
  { date: "2026-07-13", newLeads: 29, qualified: 19, booked: 8, rejected: 2, avgResponseTimeSeconds: 7 },
  { date: "2026-07-14", newLeads: 33, qualified: 22, booked: 9, rejected: 2, avgResponseTimeSeconds: 6 },
  { date: "2026-07-15", newLeads: 32, qualified: 21, booked: 9, rejected: 2, avgResponseTimeSeconds: 7 },
  { date: "2026-07-16", newLeads: 28, qualified: 18, booked: 7, rejected: 3, avgResponseTimeSeconds: 7 },
  { date: "2026-07-17", newLeads: 25, qualified: 16, booked: 6, rejected: 3, avgResponseTimeSeconds: 8 },
  { date: "2026-07-18", newLeads: 14, qualified: 9, booked: 3, rejected: 2, avgResponseTimeSeconds: 9 },
  { date: "2026-07-19", newLeads: 12, qualified: 8, booked: 3, rejected: 1, avgResponseTimeSeconds: 10 },
  { date: "2026-07-20", newLeads: 34, qualified: 23, booked: 10, rejected: 2, avgResponseTimeSeconds: 6 },
  { date: "2026-07-21", newLeads: 19, qualified: 12, booked: 5, rejected: 1, avgResponseTimeSeconds: 6 },
];

export const kpiTimeseriesFixture = KpiTimeseriesPointSchema.array().parse(timeseriesRaw);

const recentLeadsRaw = leadsFixture.map(({ transcript, qualification, ...rest }) => ({
  ...rest,
  qualificationScore: qualification.score,
}));

const overviewRaw: DashboardOverview = {
  summary: {
    leadsToday: 19,
    leadsTodayDelta: 0.12,
    qualifiedToday: 12,
    qualifiedRate: 0.63,
    bookedToday: 5,
    avgResponseTimeSeconds: 6,
    avgResponseTimeDelta: -0.18,
  },
  timeseries: kpiTimeseriesFixture,
  recentLeads: LeadListItemSchema.array().parse(recentLeadsRaw),
};

export const dashboardOverviewFixture = DashboardOverviewSchema.parse(overviewRaw);
