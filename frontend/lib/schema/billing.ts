import { z } from "zod";

export const InvoiceSchema = z.object({
  id: z.string(),
  date: z.string(),
  amountCents: z.number(),
  status: z.enum(["paid", "open", "void"]),
  pdfUrl: z.string(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const BillingSchema = z.object({
  planId: z.string(),
  planName: z.string(),
  leadsProcessedThisCycle: z.number(),
  leadsIncluded: z.number(),
  cycleEndsAt: z.string(),
  invoices: z.array(InvoiceSchema),
});
export type Billing = z.infer<typeof BillingSchema>;
