import { BillingSchema, type Billing } from "@/lib/schema";

const raw: Billing = {
  planId: "growth",
  planName: "Growth",
  leadsProcessedThisCycle: 612,
  leadsIncluded: 1000,
  cycleEndsAt: "2026-08-01T00:00:00Z",
  invoices: [
    { id: "inv_2026_06", date: "2026-06-01T00:00:00Z", amountCents: 59900, status: "paid", pdfUrl: "#" },
    { id: "inv_2026_05", date: "2026-05-01T00:00:00Z", amountCents: 59900, status: "paid", pdfUrl: "#" },
    { id: "inv_2026_04", date: "2026-04-01T00:00:00Z", amountCents: 59900, status: "paid", pdfUrl: "#" },
  ],
};

export const billingFixture = BillingSchema.parse(raw);
