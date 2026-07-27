import { z } from "zod";

export const TeamRoleSchema = z.enum(["owner", "admin", "sales_rep"]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: TeamRoleSchema,
  avatarSrc: z.string().nullable(),
  invitedAt: z.string(),
  status: z.enum(["active", "invited"]),
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;
