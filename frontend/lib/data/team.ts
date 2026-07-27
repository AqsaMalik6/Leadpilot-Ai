import { backendFetch } from "@/lib/backend-fetch";
import { TeamMemberSchema, type TeamMember } from "@/lib/schema";

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await backendFetch("/api/team");
  if (!res.ok) throw new Error(`Failed to load team (${res.status})`);
  const data = await res.json();
  return TeamMemberSchema.array().parse(data.team);
}
