import { z } from "zod";
import { MessageRoleSchema, LeadStatusSchema } from "./lead";

export const DemoScriptStepSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  text: z.string(),
  delayMs: z.number(),
});
export type DemoScriptStep = z.infer<typeof DemoScriptStepSchema>;

export const DemoScriptSchema = z.object({
  id: z.string(),
  label: z.string(),
  industry: z.string().optional(),
  steps: z.array(DemoScriptStepSchema),
  outcome: LeadStatusSchema,
});
export type DemoScript = z.infer<typeof DemoScriptSchema>;
