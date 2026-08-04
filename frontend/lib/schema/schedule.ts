import { z } from "zod";

// Backs the dashboard's Schedule page — Calendly bookings/reschedules/cancellations
// detected by parsing notification emails in the connected Gmail inbox (no public
// webhook URL available on localhost — see backend's calendly_email_parser.py).
export const ScheduleEventSchema = z.object({
  id: z.string(),
  leadId: z.string().nullable(),
  inviteeName: z.string(),
  inviteeEmail: z.string(),
  eventTypeName: z.string().nullable(),
  eventStart: z.string(),
  durationMinutes: z.number(),
  kind: z.enum(["created", "rescheduled", "canceled"]),
  rescheduleReason: z.string().nullable(),
  status: z.enum(["pending_review", "approved", "rejected"]),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;
