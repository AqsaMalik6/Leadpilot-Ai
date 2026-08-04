import { z } from "zod";

// SKILL-DIGITAL-FTE-UPGRADE.md §1/§7 — the AI reasoning/timeline log the dashboard's
// lead-detail view reads from (GET /api/leads/{id}/actions).
export const AgentActionTypeSchema = z.enum([
  "replied",
  "followed_up",
  "marked_cold",
  "scheduled_meeting",
  "classified_temperature",
  "notified_owner",
  "updated_pipeline_stage",
  "manual_override",
  "recorded_qualification",
]);
export type AgentActionType = z.infer<typeof AgentActionTypeSchema>;

export const AgentActionSchema = z.object({
  id: z.string(),
  actionType: AgentActionTypeSchema,
  reasoning: z.string(),
  createdAt: z.string(),
});
export type AgentAction = z.infer<typeof AgentActionSchema>;
