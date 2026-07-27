import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaGoodDirection = "up",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number;
  deltaGoodDirection?: "up" | "down";
}) {
  const isPositive = (delta ?? 0) >= 0;
  const isGood = deltaGoodDirection === "up" ? isPositive : !isPositive;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-500/10 text-signal-600">
            <Icon className="h-4 w-4" />
          </span>
          {typeof delta === "number" && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isGood ? "text-signal-600" : "text-red-700",
              )}
            >
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <div className="mt-4 font-display text-2xl font-bold text-ink-950">{value}</div>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}
