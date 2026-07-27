import { z } from "zod";

export const ChannelSchema = z.enum(["website_form", "whatsapp", "email", "gmail"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const LeadStatusSchema = z.enum(["new", "qualified", "booked", "rejected"]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

// SKILL-DIGITAL-FTE-UPGRADE.md §1/§6 — additive to LeadStatus, never replaces it.
export const PipelineStageSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "meeting_scheduled",
  "proposal_sent",
  "won",
  "lost",
]);
export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const TemperatureSchema = z.enum(["hot", "warm", "cold"]);
export type Temperature = z.infer<typeof TemperatureSchema>;

export const MessageRoleSchema = z.enum(["lead", "agent", "system"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const TranscriptMessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  text: z.string(),
  timestamp: z.string(),
  typingDurationMs: z.number().nullable().optional(),
});
export type TranscriptMessage = z.infer<typeof TranscriptMessageSchema>;

export const QualificationAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  field: z.enum(["budget", "timeline", "need", "companySize", "authority"]),
});
export type QualificationAnswer = z.infer<typeof QualificationAnswerSchema>;

export const QualificationSchema = z.object({
  budget: z.string().nullable(),
  timeline: z.string().nullable(),
  need: z.string().nullable(),
  companySize: z.string().nullable(),
  decisionAuthority: z.boolean().nullable(),
  answers: z.array(QualificationAnswerSchema),
  score: z.number().min(0).max(100).nullable(),
});
export type Qualification = z.infer<typeof QualificationSchema>;

export const LeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  channel: ChannelSchema,
  status: LeadStatusSchema,
  createdAt: z.string(),
  respondedAt: z.string().nullable(),
  responseTimeSeconds: z.number().nullable(),
  transcript: z.array(TranscriptMessageSchema),
  qualification: QualificationSchema,
  calendlyBookingUrl: z.string().nullable(),
  bookedAt: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  isLive: z.boolean(),
  pipelineStage: PipelineStageSchema,
  temperature: TemperatureSchema,
  followUpCount: z.number(),
  nextFollowUpAt: z.string().nullable(),
});
export type Lead = z.infer<typeof LeadSchema>;

export const LeadListItemSchema = LeadSchema.omit({
  transcript: true,
  qualification: true,
}).extend({
  qualificationScore: z.number().min(0).max(100).nullable(),
});
export type LeadListItem = z.infer<typeof LeadListItemSchema>;

export const LeadFiltersSchema = z.object({
  status: LeadStatusSchema.optional(),
  channel: ChannelSchema.optional(),
  search: z.string().optional(),
});
export type LeadFilters = z.infer<typeof LeadFiltersSchema>;
