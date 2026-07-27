import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/lib/schema";

// Canonical status → label/variant map (SKILL-FRONTEND.md §2.2): New=amber,
// Qualified=signal-green, Booked=blue, Rejected=red. This is the ONLY place that
// mapping should live, so it never drifts between the dashboard and marketing mocks.
const STATUS_CONFIG: Record<LeadStatus, { label: string; variant: "new" | "qualified" | "booked" | "rejected" }> = {
  new: { label: "New", variant: "new" },
  qualified: { label: "Qualified", variant: "qualified" },
  booked: { label: "Booked", variant: "booked" },
  rejected: { label: "Rejected", variant: "rejected" },
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
