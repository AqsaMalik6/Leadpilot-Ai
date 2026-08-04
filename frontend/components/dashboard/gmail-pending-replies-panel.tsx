"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import type { GmailPendingReply } from "@/lib/schema";

// Only ever populated when AgentConfig.gmail_reply_mode="review_first" — see
// app/jobs/gmail_poll.py's _deliver_or_hold_reply. Nothing renders here at all in
// the default auto_send mode, since the list is simply always empty.
export function GmailPendingRepliesPanel() {
  const [replies, setReplies] = useState<GmailPendingReply[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gmail/pending-replies")
      .then((res) => res.json())
      .then((data) => setReplies(data.pendingReplies ?? []))
      .catch(() => setReplies([]));
  }, []);

  async function resolve(id: string, action: "approve" | "reject") {
    setBusyId(id);
    const res = await fetch(`/api/gmail/pending-replies/${id}/${action}`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      toast({ title: `Failed to ${action} reply`, variant: "destructive" });
      return;
    }
    setReplies((prev) => (prev ?? []).filter((r) => r.id !== id));
    toast({ title: action === "approve" ? "Reply sent" : "Reply rejected — nothing sent" });
  }

  if (!replies || replies.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-ink-950">Pending Gmail replies</h2>
      {replies.map((reply) => (
        <Card key={reply.id}>
          <CardContent className="space-y-2 pt-6">
            <div className="text-sm text-slate-500">
              To: <span className="text-ink-950">{reply.toEmail}</span> · {reply.subject}
            </div>
            <p className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-950">{reply.bodyText}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={busyId === reply.id} onClick={() => resolve(reply.id, "approve")}>
                Approve & send
              </Button>
              <Button size="sm" variant="outline" disabled={busyId === reply.id} onClick={() => resolve(reply.id, "reject")}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
