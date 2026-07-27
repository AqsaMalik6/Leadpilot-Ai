import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration } from "@/lib/utils";
import type { LeadListItem } from "@/lib/schema";
import { Inbox } from "lucide-react";

export function LeadsTablePreview({ leads, limit = 5 }: { leads: LeadListItem[]; limit?: number }) {
  const rows = leads.slice(0, limit);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No leads yet"
        description="Connect your first lead channel to start seeing conversations here."
        actionLabel="Connect a channel"
        actionHref="/dashboard/integrations"
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Lead</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Response time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>
              <div className="font-medium text-ink-950">{lead.name}</div>
              <div className="text-xs text-slate-500">{lead.company ?? "—"}</div>
            </TableCell>
            <TableCell className="capitalize text-slate-500">{lead.channel.replace("_", " ")}</TableCell>
            <TableCell>
              <StatusBadge status={lead.status} />
            </TableCell>
            <TableCell className="text-slate-500">{formatDuration(lead.responseTimeSeconds)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
