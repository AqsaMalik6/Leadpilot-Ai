"use client";

import { useState } from "react";
import { Search, Building2 } from "lucide-react";
import { useAddToCampaign, useDeleteOutboundLead, useOutboundLeads, useOutboundSearch } from "@/hooks/use-outbound-leads";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";
import OutboundLeadsTable from "@/components/dashboard/outbound-leads-table";
import type { OutboundLead } from "@/lib/schema";

const RESULT_COUNT_OPTIONS = [5, 10, 15, 25, 50];

export default function OutboundLeadsPage() {
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(15);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: savedLeads, isLoading: loadingSaved } = useOutboundLeads();
  const search = useOutboundSearch();
  const addToCampaign = useAddToCampaign();
  const deleteOutboundLead = useDeleteOutboundLead();

  const leads = search.data ?? savedLeads ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    search.mutate(
      { category, location, maxResults },
      {
        onSuccess: (results) => {
          setSelectedIds(new Set());
          toast({ title: `Found ${results.length} lead${results.length === 1 ? "" : "s"}` });
        },
        onError: (err) => toast({ title: "Search failed", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDelete(lead: OutboundLead) {
    if (!window.confirm(`Remove ${lead.businessName} from your outbound leads?`)) return;
    deleteOutboundLead.mutate(lead.id, {
      onSuccess: () => toast({ title: "Lead removed" }),
      onError: () => toast({ title: "Couldn't remove lead", variant: "destructive" }),
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddToCampaign() {
    if (selectedIds.size === 0) return;
    addToCampaign.mutate(
      { leadIds: Array.from(selectedIds) },
      {
        onSuccess: (data) => {
          toast({ title: `Added ${data.added} lead${data.added === 1 ? "" : "s"} to your pipeline` });
          setSelectedIds(new Set());
        },
        onError: (err) => toast({ title: "Couldn't add leads", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Outbound Leads</h1>
        <p className="text-sm text-slate-500">
          Free prospecting across three sources — OpenStreetMap and Geoapify for local businesses, GitHub for software
          houses/AI/SaaS companies — routed automatically by category. Select the ones worth pursuing and add them to
          your pipeline; replies come back through your existing Gmail/WhatsApp agent.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <Input
              placeholder="Category — e.g. real estate agency, or AI software house"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
            <Input
              placeholder="Location — city, country, or both (e.g. Lahore, or Pakistan, or Lahore, Pakistan)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required={!isLikelyTech(category)}
            />
            <Select value={String(maxResults)} onValueChange={(v) => setMaxResults(Number(v))}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULT_COUNT_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} leads
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={search.isPending}>
              <Search className="mr-1.5 h-4 w-4" />
              {search.isPending ? "Searching…" : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {search.isPending || loadingSaved ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Building2}
                title="No outbound leads yet"
                description="Search a category and location above — matches are saved here so you can review before adding any to your pipeline."
              />
            </div>
          ) : (
            <>
              <OutboundLeadsTable
                leads={leads}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onDelete={handleDelete}
                deletingId={deleteOutboundLead.isPending ? deleteOutboundLead.variables : undefined}
              />
              <div className="flex items-center justify-between border-t border-line p-4">
                <span className="text-sm text-slate-500">{selectedIds.size} selected</span>
                <Button onClick={handleAddToCampaign} disabled={selectedIds.size === 0 || addToCampaign.isPending}>
                  {addToCampaign.isPending ? "Adding…" : "Add Selected to Pipeline"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function isLikelyTech(category: string): boolean {
  return /software|saas|\bit\b|tech|developer|\bai\b|startup/i.test(category);
}
