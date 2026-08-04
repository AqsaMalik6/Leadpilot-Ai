import { MapPin, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OutboundLead } from "@/lib/schema";

const SOURCE_LABEL: Record<OutboundLead["source"], string> = {
  osm: "OpenStreetMap",
  geoapify: "Geoapify",
  github: "GitHub",
};

interface OutboundLeadsTableProps {
  leads: OutboundLead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (lead: OutboundLead) => void;
  deletingId?: string;
}

export default function OutboundLeadsTable({ leads, selectedIds, onToggleSelect, onDelete, deletingId }: OutboundLeadsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Business</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => {
          const hasContact = Boolean(lead.phone || lead.email || lead.website);
          const mapsUrl =
            !hasContact && lead.lat != null && lead.lng != null ? `https://www.google.com/maps?q=${lead.lat},${lead.lng}` : null;
          return (
            <TableRow key={lead.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(lead.id)}
                  onCheckedChange={() => onToggleSelect(lead.id)}
                  disabled={lead.status === "added_to_campaign"}
                />
              </TableCell>
              <TableCell>
                <div className="font-medium text-ink-950">{lead.businessName}</div>
                <div className="text-xs text-slate-500">{lead.address ?? lead.location ?? "—"}</div>
                {lead.techStack && lead.techStack.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {lead.techStack.slice(0, 5).map((t) => (
                      <Badge key={t} variant="neutral" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-slate-500">{lead.category}</TableCell>
              <TableCell className="text-slate-500">
                <div>{lead.phone ?? "—"}</div>
                <div className="text-xs">
                  {lead.email ? (
                    lead.email
                  ) : lead.website ? (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="text-signal-600 hover:underline">
                      {lead.website}
                    </a>
                  ) : mapsUrl ? (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal-600 hover:underline">
                      <MapPin className="h-3 w-3" />
                      View on Google Maps
                    </a>
                  ) : (
                    "no contact found"
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="neutral">{SOURCE_LABEL[lead.source]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={lead.status === "added_to_campaign" ? "qualified" : "neutral"}>
                  {lead.status === "added_to_campaign" ? "In campaign" : "Found"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${lead.businessName}`}
                  disabled={deletingId === lead.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(lead);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
