import { backendFetch } from "@/lib/backend-fetch";
import { BillingSchema, type Billing } from "@/lib/schema";

export async function getBilling(): Promise<Billing> {
  const res = await backendFetch("/api/billing/plan");
  if (!res.ok) throw new Error(`Failed to load billing (${res.status})`);
  return BillingSchema.parse(await res.json());
}
