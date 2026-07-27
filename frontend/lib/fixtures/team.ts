import { TeamMemberSchema, type TeamMember } from "@/lib/schema";

const raw: TeamMember[] = [
  {
    id: "team_1",
    name: "Jordan Ellis",
    email: "jordan@yourcompany.example",
    role: "owner",
    avatarSrc: null,
    invitedAt: "2026-05-20T09:00:00Z",
    status: "active",
  },
  {
    id: "team_2",
    name: "Priya Shah",
    email: "priya@yourcompany.example",
    role: "admin",
    avatarSrc: null,
    invitedAt: "2026-05-22T09:00:00Z",
    status: "active",
  },
  {
    id: "team_3",
    name: "Marcus Lee",
    email: "marcus@yourcompany.example",
    role: "sales_rep",
    avatarSrc: null,
    invitedAt: "2026-06-01T09:00:00Z",
    status: "active",
  },
  {
    id: "team_4",
    name: "Ines Duarte",
    email: "ines@yourcompany.example",
    role: "sales_rep",
    avatarSrc: null,
    invitedAt: "2026-07-18T09:00:00Z",
    status: "invited",
  },
];

export const teamFixture = TeamMemberSchema.array().parse(raw);
