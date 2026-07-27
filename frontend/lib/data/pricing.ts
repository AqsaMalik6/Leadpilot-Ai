import { backendFetch } from "@/lib/backend-fetch";
import { PricingTierSchema, type PricingTier } from "@/lib/schema";

export async function getPricingTiers(): Promise<PricingTier[]> {
  const res = await backendFetch("/api/cms/pricing-tiers");
  if (!res.ok) throw new Error("Failed to load pricing tiers");
  const body = await res.json();
  return body.pricingTiers.map((t: unknown) => PricingTierSchema.parse(t));
}
