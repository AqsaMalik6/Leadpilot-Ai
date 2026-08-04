"use client";

import Link from "next/link";
import { CalendarClock, Check, X, RefreshCw, Ban } from "lucide-react";
import { useApproveScheduleEvent, useRejectScheduleEvent, useScheduleEvents } from "@/hooks/use-schedule";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import type { ScheduleEvent } from "@/lib/schema";

const KIND_LABEL: Record<ScheduleEvent["kind"], string> = {
  created: "New booking",
  rescheduled: "Rescheduled",
  canceled: "Canceled",
};

const KIND_ICON: Record<ScheduleEvent["kind"], typeof RefreshCw> = {
  created: CalendarClock,
  rescheduled: RefreshCw,
  canceled: Ban,
};

function ScheduleEventCard({ event }: { event: ScheduleEvent }) {
  const approve = useApproveScheduleEvent();
  const reject = useRejectScheduleEvent();
  const Icon = KIND_ICON[event.kind];
  const isPending = event.status === "pending_review";

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-500/10 text-signal-600">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-ink-950">{event.inviteeName}</h3>
              <Badge variant="neutral">{KIND_LABEL[event.kind]}</Badge>
              {event.status !== "pending_review" && (
                <Badge variant={event.status === "approved" ? "qualified" : "rejected"}>
                  {event.status === "approved" ? "Approved" : "Rejected"}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">{event.inviteeEmail}</p>
            <p className="mt-1 text-sm text-ink-950">
              {formatDate(event.eventStart)} · {event.durationMinutes} min{event.eventTypeName ? ` · ${event.eventTypeName}` : ""}
            </p>
            {event.rescheduleReason && (
              <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-slate-600">
                Reason: {event.rescheduleReason}
              </p>
            )}
            {event.leadId ? (
              <Link href={`/dashboard/leads/${event.leadId}`} className="mt-2 inline-block text-xs font-medium text-signal-600 hover:underline">
                View matched lead →
              </Link>
            ) : (
              <p className="mt-2 text-xs text-red-700">No matching lead found for this email yet.</p>
            )}
          </div>
        </div>
        {isPending && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              disabled={approve.isPending || reject.isPending}
              onClick={() =>
                approve.mutate(event.id, {
                  onSuccess: () => toast({ title: "Approved", description: `${event.inviteeName}'s meeting is now on the lead's pipeline.` }),
                  onError: (err) => toast({ title: "Couldn't approve", description: err instanceof Error ? err.message : undefined, variant: "destructive" }),
                })
              }
            >
              <Check className="mr-1.5 h-4 w-4" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={approve.isPending || reject.isPending}
              onClick={() => reject.mutate(event.id, { onSuccess: () => toast({ title: "Dismissed" }) })}
            >
              <X className="mr-1.5 h-4 w-4" /> Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const { data: events, isLoading } = useScheduleEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">Schedule</h1>
        <p className="text-sm text-slate-500">
          Calendly bookings, reschedules, and cancellations detected in your connected Gmail inbox — review and approve before they update a
          lead.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !events || events.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No meetings detected yet"
          description="Once a lead books, reschedules, or cancels through your Calendly link, the confirmation email LeadPilot reads from your connected Gmail will show up here for review."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <ScheduleEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
