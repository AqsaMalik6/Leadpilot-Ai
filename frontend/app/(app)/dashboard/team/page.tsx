import { Card, CardContent } from "@/components/ui/card";
import { InviteMemberDialog } from "@/components/dashboard/invite-member-dialog";
import { TeamMemberRow } from "@/components/dashboard/team-member-row";
import { getTeamMembers } from "@/lib/data/team";

export default async function TeamPage() {
  const members = await getTeamMembers();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">Team</h1>
          <p className="text-sm text-slate-500">Manage who has access to your LeadPilot dashboard.</p>
        </div>
        <InviteMemberDialog />
      </div>

      <Card>
        <CardContent className="divide-y divide-line p-0">
          {members.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
