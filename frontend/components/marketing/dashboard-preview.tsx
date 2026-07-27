import { Users, CheckCircle2, CalendarCheck2, Timer } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LeadsTablePreview } from "@/components/dashboard/leads-table-preview";
import { dashboardOverviewFixture } from "@/lib/fixtures/kpi";

export function DashboardPreview() {
  const { summary, recentLeads } = dashboardOverviewFixture;

  return (
    <section className="section-y bg-surface-2">
      <div className="container-lp">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              This is the exact dashboard you get
            </h2>
            <p className="mt-4 text-slate-500">
              Not a mockup — the components below are the same ones rendered in your real
              dashboard, wired to live fixture data for this preview.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="mt-12 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
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
            <div className="mt-6 overflow-hidden rounded-xl border border-line">
              <LeadsTablePreview leads={recentLeads} />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
