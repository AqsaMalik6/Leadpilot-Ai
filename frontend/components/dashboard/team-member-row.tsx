"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import type { TeamMember } from "@/lib/schema";

const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", sales_rep: "Sales rep" };

export function TeamMemberRow({ member }: { member: TeamMember }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast({ title: "Failed to remove teammate", variant: "destructive" });
      return;
    }
    toast({ title: `${member.name} removed` });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{member.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-medium text-ink-950">{member.name}</div>
          <div className="text-xs text-slate-500">{member.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {member.status === "invited" && <Badge variant="new">Invited</Badge>}
        <span className="text-sm text-slate-500">{ROLE_LABELS[member.role]}</span>
        {member.role !== "owner" && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-slate-400 hover:text-red-700"
            aria-label={`Remove ${member.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
