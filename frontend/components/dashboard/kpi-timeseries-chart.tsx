"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { KpiTimeseriesPoint } from "@/lib/schema";

export function KpiTimeseriesChart({ data }: { data: KpiTimeseriesPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="qualifiedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="newLeadsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#64748B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#64748B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => v.slice(5)}
            tick={{ fontSize: 11, fill: "#64748B" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
            labelStyle={{ color: "#0B0F0E", fontWeight: 600 }}
          />
          <Area
            type="monotone"
            dataKey="newLeads"
            stroke="#64748B"
            fill="url(#newLeadsGradient)"
            strokeWidth={2}
            name="New leads"
          />
          <Area
            type="monotone"
            dataKey="qualified"
            stroke="#16A34A"
            fill="url(#qualifiedGradient)"
            strokeWidth={2}
            name="Qualified"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
