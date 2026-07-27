"use client";

import Link from "next/link";
import { Users, CheckCircle2, CalendarCheck2, Timer, ArrowRight } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { KpiTimeseriesChart } from "@/components/dashboard/kpi-timeseries-chart";
import { LeadsTablePreview } from "@/components/dashboard/leads-table-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardOverview } from "@/hooks/use-kpi";

export default function DashboardOverviewPage() {
  const { data, isLoading } = useDashboardOverview();

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const { summary, timeseries, recentLeads } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Overview</h1>
        <p className="text-sm text-slate-500">Everything happening across your lead channels today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Leads today" value={String(summary.leadsToday)} delta={summary.leadsTodayDelta} />
        <KpiCard
          icon={CheckCircle2}
          label="Qualified today"
          value={String(summary.qualifiedToday)}
          delta={summary.qualifiedRate - 0.5}
        />
        <KpiCard icon={CalendarCheck2} label="Booked today" value={String(summary.bookedToday)} />
        <KpiCard
          icon={Timer}
          label="Avg. response time"
          value={`${summary.avgResponseTimeSeconds}s`}
          delta={summary.avgResponseTimeDelta}
          deltaGoodDirection="down"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads &amp; qualifications, last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiTimeseriesChart data={timeseries} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Recent leads</CardTitle>
          <Link href="/dashboard/leads" className="flex items-center gap-1 text-sm font-medium text-signal-600 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <LeadsTablePreview leads={recentLeads} limit={6} />
        </CardContent>
      </Card>
    </div>
  );
}
