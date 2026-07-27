"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, Gauge, Sparkles, Clock, Check, XCircle, FileText, ThumbsUp, ThumbsDown } from "lucide-react";
import { LiveTranscript } from "@/components/shared/live-transcript";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useApproveProposal,
  useEditProposal,
  useGenerateProposal,
  useLead,
  useLeadActions,
  useProposal,
  useSetLeadOutcome,
  useUpdateLeadStatus,
} from "@/hooks/use-leads";
import { toast } from "@/components/ui/use-toast";
import { formatDate, formatDuration } from "@/lib/utils";
import type { AgentActionType, Lead, LeadStatus } from "@/lib/schema";

const PIPELINE_STAGE_ORDER = ["new", "contacted", "qualified", "meeting_scheduled", "proposal_sent", "won"] as const;
const PIPELINE_STEPPER_LABELS: Record<(typeof PIPELINE_STAGE_ORDER)[number], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  meeting_scheduled: "Meeting scheduled",
  proposal_sent: "Proposal sent",
  won: "Won",
};

// Real leads today mostly move new -> contacted -> (qualified/lost) since the
// qualification agent only has one Gmail/WhatsApp reply per turn to work with — this
// infers how far a lead actually got even when pipelineStage jumped straight to "lost"
// (close_conversation doesn't pass through every intermediate stage on its way out).
function reachedStageIndex(lead: Lead): number {
  const rawIndex = PIPELINE_STAGE_ORDER.findIndex((s) => s === lead.pipelineStage);
  const inferredFromData = lead.qualification.score !== null ? (lead.bookedAt ? 3 : 2) : lead.respondedAt ? 1 : 0;
  const index = lead.pipelineStage === "lost" ? inferredFromData : Math.max(rawIndex, inferredFromData);
  return Math.min(Math.max(index, 0), PIPELINE_STAGE_ORDER.length - 1);
}

function PipelineStepper({ lead }: { lead: Lead }) {
  const isLost = lead.pipelineStage === "lost";
  const isWon = lead.pipelineStage === "won";
  const reachedIndex = reachedStageIndex(lead);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start">
          {PIPELINE_STAGE_ORDER.map((stage, i) => {
            const done = i <= reachedIndex;
            const isCurrent = i === reachedIndex && !isLost;
            return (
              <div key={stage} className="flex flex-1 flex-col items-center text-center">
                <div className="flex w-full items-center">
                  {i > 0 && <div className={`h-0.5 flex-1 ${i <= reachedIndex ? "bg-signal-500" : "bg-line"}`} />}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      done
                        ? "border-signal-500 bg-signal-500 text-white"
                        : isCurrent
                          ? "border-signal-500 text-signal-600"
                          : "border-line text-slate-400"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < PIPELINE_STAGE_ORDER.length - 1 && (
                    <div className={`h-0.5 flex-1 ${i < reachedIndex ? "bg-signal-500" : "bg-line"}`} />
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium ${done || isCurrent ? "text-ink-950" : "text-slate-400"}`}>
                  {PIPELINE_STEPPER_LABELS[stage]}
                </span>
              </div>
            );
          })}
        </div>
        {isLost && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Lost</strong> after reaching &ldquo;{PIPELINE_STEPPER_LABELS[PIPELINE_STAGE_ORDER[reachedIndex] ?? "new"]}&rdquo; —{" "}
              {lead.rejectionReason ?? "no reason logged"}
            </span>
          </div>
        )}
        {isWon && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-signal-500/30 bg-signal-500/10 px-3 py-2 text-sm text-signal-700">
            <Check className="h-4 w-4 shrink-0" />
            <span>Deal won — full pipeline completed.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Step 4 of the Digital FTE flow: AI drafts a proposal, a manager reviews and approves
// it here, only then does it actually get emailed to the client. Visible once the
// lead is at least "qualified" — a proposal can reasonably be prepared before the
// Calendly meeting itself has synced back (which needs a public webhook URL, not
// available on localhost), so this doesn't hard-block on meeting_scheduled specifically.
const PROPOSAL_ELIGIBLE_STAGES = new Set(["qualified", "meeting_scheduled", "proposal_sent", "won"]);

function ProposalCard({ lead }: { lead: Lead }) {
  const { data: proposal, isLoading } = useProposal(lead.id);
  const generate = useGenerateProposal(lead.id);
  const edit = useEditProposal(lead.id);
  const approve = useApproveProposal(lead.id);
  const setOutcome = useSetLeadOutcome(lead.id);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (proposal && !dirty) {
      setSubject(proposal.subject);
      setBody(proposal.body);
    }
  }, [proposal, dirty]);

  if (!PROPOSAL_ELIGIBLE_STAGES.has(lead.pipelineStage)) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-signal-600" /> Proposal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !proposal ? (
          <>
            <p className="text-slate-500">No proposal drafted yet for this lead.</p>
            <Button onClick={() => generate.mutate(undefined, { onSuccess: () => setDirty(false) })} disabled={generate.isPending}>
              {generate.isPending ? "Drafting with AI…" : "Generate proposal"}
            </Button>
          </>
        ) : (
          <>
            {proposal.status === "draft" ? (
              <div className="space-y-2">
                <Input value={subject} onChange={(e) => { setSubject(e.target.value); setDirty(true); }} placeholder="Subject" />
                <Textarea
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setDirty(true); }}
                  rows={8}
                  placeholder="Proposal body"
                  className="whitespace-pre-wrap"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-line bg-slate-50 p-3">
                <p className="font-medium text-ink-950">{proposal.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">{proposal.body}</p>
              </div>
            )}
            {proposal.status === "draft" && (
              <div className="flex flex-wrap gap-2">
                {dirty && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      edit.mutate(
                        { subject, body },
                        { onSuccess: () => { setDirty(false); toast({ title: "Draft saved" }); } },
                      )
                    }
                    disabled={edit.isPending}
                  >
                    {edit.isPending ? "Saving…" : "Save changes"}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    const send = () =>
                      approve.mutate(undefined, {
                        onSuccess: (res) =>
                          toast({
                            title: res.sent ? "Proposal sent" : "Approved — delivery fell back to console log",
                            description: res.sent
                              ? `Emailed to ${lead.email}.`
                              : "Email send failed (see server logs) — the draft is saved as approved.",
                          }),
                      });
                    if (dirty) {
                      edit.mutate({ subject, body }, { onSuccess: () => { setDirty(false); send(); } });
                    } else {
                      send();
                    }
                  }}
                  disabled={approve.isPending || edit.isPending}
                >
                  {approve.isPending ? "Sending…" : "Approve & send"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generate.mutate(undefined, { onSuccess: () => setDirty(false) })}
                  disabled={generate.isPending}
                >
                  Regenerate draft
                </Button>
              </div>
            )}
            {proposal.status === "sent" && (
              <>
                <p className="text-xs text-slate-500">Sent {proposal.sentAt ? formatDate(proposal.sentAt) : ""}</p>
                {lead.pipelineStage === "proposal_sent" && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setOutcome.mutate({ outcome: "won" })} disabled={setOutcome.isPending}>
                      <ThumbsUp className="mr-1.5 h-4 w-4" /> Mark won
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOutcome.mutate({ outcome: "lost", reason: "Client declined the proposal" })}
                      disabled={setOutcome.isPending}
                    >
                      <ThumbsDown className="mr-1.5 h-4 w-4" /> Mark lost
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const TEMPERATURE_BADGE: Record<string, { variant: "qualified" | "new" | "neutral"; label: string }> = {
  hot: { variant: "qualified", label: "Hot" },
  warm: { variant: "new", label: "Warm" },
  cold: { variant: "neutral", label: "Cold" },
};

const ACTION_TYPE_LABELS: Record<AgentActionType, string> = {
  replied: "Replied",
  followed_up: "Followed up",
  marked_cold: "Marked cold",
  scheduled_meeting: "Meeting scheduled",
  classified_temperature: "Classified",
  notified_owner: "Notified owner",
  updated_pipeline_stage: "Pipeline updated",
  manual_override: "Manual override",
};

export function LeadDetailView({ id }: { id: string }) {
  const { data: lead, isLoading } = useLead(id);
  const { data: actions } = useLeadActions(id);
  const updateStatus = useUpdateLeadStatus();

  if (isLoading || !lead) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  function handleStatusChange(status: LeadStatus) {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () =>
          toast({ title: "Status updated", description: `${lead!.name} marked as ${status}.` }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-ink-950">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{lead.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {lead.company && (
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {lead.company}</span>
            )}
            {lead.email && (
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {lead.email}</span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {lead.phone}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={lead.status} />
          <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PipelineStepper lead={lead} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversation transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <LiveTranscript messages={lead.transcript} autoPlay={false} className="max-h-[32rem]" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ProposalCard lead={lead} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-signal-600" /> Follow-up status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Temperature</span>
                <Badge variant={TEMPERATURE_BADGE[lead.temperature]?.variant ?? "neutral"}>
                  {TEMPERATURE_BADGE[lead.temperature]?.label ?? lead.temperature}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Follow-ups sent</span>
                <span className="font-medium text-ink-950">{lead.followUpCount}</span>
              </div>
              {lead.nextFollowUpAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Next check-in</span>
                  <span className="font-medium text-ink-950">{formatDate(lead.nextFollowUpAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-signal-600" /> AI reasoning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!actions || actions.length === 0 ? (
                <p className="text-slate-500">No autonomous actions logged yet.</p>
              ) : (
                actions.map((a) => (
                  <div key={a.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink-950">{ACTION_TYPE_LABELS[a.actionType]}</span>
                      <span className="text-xs text-slate-500">{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-slate-500">{a.reasoning}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-signal-600" /> Qualification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Score</span>
                <span className="font-medium text-ink-950">
                  {lead.qualification.score !== null ? `${lead.qualification.score}/100` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium text-ink-950">{lead.qualification.budget ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timeline</span>
                <span className="font-medium text-ink-950">{lead.qualification.timeline ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Company size</span>
                <span className="font-medium text-ink-950">{lead.qualification.companySize ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Response time</span>
                <span className="font-medium text-ink-950">{formatDuration(lead.responseTimeSeconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Received</span>
                <span className="font-medium text-ink-950">{formatDate(lead.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {lead.calendlyBookingUrl && (
            <Card>
              <CardContent className="pt-6">
                <a href={lead.calendlyBookingUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-signal-600 hover:underline">
                  View Calendly booking →
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
