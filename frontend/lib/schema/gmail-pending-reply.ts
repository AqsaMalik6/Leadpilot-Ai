import { z } from "zod";

export const GmailPendingReplySchema = z.object({
  id: z.string(),
  leadId: z.string(),
  toEmail: z.string(),
  subject: z.string(),
  bodyText: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  createdAt: z.string(),
});
export type GmailPendingReply = z.infer<typeof GmailPendingReplySchema>;
