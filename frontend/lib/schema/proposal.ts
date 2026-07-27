import { z } from "zod";

// Digital FTE post-meeting flow (GET/POST /api/leads/{id}/proposal) — draft -> a
// manager approves -> sent, mirrors the backend's proposals.status state machine.
export const ProposalStatusSchema = z.enum(["draft", "approved", "sent"]);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  status: ProposalStatusSchema,
  createdAt: z.string(),
  sentAt: z.string().nullable(),
});
export type Proposal = z.infer<typeof ProposalSchema>;

export const OutcomeSchema = z.enum(["won", "lost"]);
export type Outcome = z.infer<typeof OutcomeSchema>;
