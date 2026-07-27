import { z } from "zod";

export const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(["lead_qualified", "lead_booked", "lead_rejected", "weekly_summary", "lead_cold"]),
  channel: z.enum(["email"]),
  status: z.enum(["pending", "sent", "failed"]),
  payload: z.record(z.unknown()),
  leadId: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;
