import { z } from "zod";

export const QualifyingQuestionSchema = z.object({
  id: z.string(),
  field: z.enum(["budget", "timeline", "need", "companySize", "authority"]),
  prompt: z.string(),
  required: z.boolean(),
});
export type QualifyingQuestion = z.infer<typeof QualifyingQuestionSchema>;

export const AgentConfigSchema = z.object({
  persona: z.string(),
  qualifyingQuestions: z.array(QualifyingQuestionSchema).min(1).max(8),
  handoffThreshold: z.number().min(0).max(100),
  calendlyUrl: z.string().nullable(),
  guardrails: z.array(z.string()),
  active: z.boolean(),
  // "auto_send" (default) or "review_first" — set once during onboarding Step 1,
  // editable later from Dashboard → Integrations. Gmail-specific: see
  // backend/app/jobs/gmail_poll.py.
  gmailReplyMode: z.enum(["auto_send", "review_first"]),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
