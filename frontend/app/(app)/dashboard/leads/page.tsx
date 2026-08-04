"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Trash2 } from "lucide-react";
import { useDeleteLead, useLeads } from "@/hooks/use-leads";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { formatDuration, formatDate } from "@/lib/utils";
import type { Channel, LeadStatus } from "@/lib/schema";
import { Inbox } from "lucide-react";

export default function LeadsPage() {
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [channel, setChannel] = useState<Channel | "all">("all");
  const [search, setSearch] = useState("");

  const { data: leads, isLoading } = useLeads({
    status: status === "all" ? undefined : status,
    channel: channel === "all" ? undefined : channel,
    search: search || undefined,
  });
  const deleteLead = useDeleteLead();

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`End this conversation with ${name}? This permanently deletes the lead and its whole chat history — a new message from them will start a fresh lead.`)) {
      return;
    }
    deleteLead.mutate(id, {
      onSuccess: () => toast({ title: "Lead deleted" }),
      onError: () => toast({ title: "Couldn't delete lead", variant: "destructive" }),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Leads</h1>
        <p className="text-sm text-slate-500">Every conversation LeadPilot has had, filterable by status and channel.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search name, company, email…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={(v) => setChannel(v as Channel | "all")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="website_form">Website form</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !leads || leads.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Inbox}
                title="No leads match these filters"
                description="Try a different status or channel, or clear your search."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response time</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/dashboard/leads/${lead.id}`} className="block">
                        <div className="font-medium text-ink-950">{lead.name}</div>
                        <div className="text-xs text-slate-500">{lead.company ?? "—"}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize text-slate-500">{lead.channel.replace("_", " ")}</TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell className="text-slate-500">{formatDuration(lead.responseTimeSeconds)}</TableCell>
                    <TableCell className="text-slate-500">{formatDate(lead.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete conversation with ${lead.name}`}
                        disabled={deleteLead.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDelete(lead.id, lead.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
