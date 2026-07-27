import { z } from "zod";

export const PricingTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  monthlyPriceCents: z.number().nullable(),
  annualPriceCents: z.number().nullable(),
  leadsIncludedPerMonth: z.number().nullable(),
  featureBullets: z.array(z.string()),
  highlighted: z.boolean(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PricingComparisonRowSchema = z.object({
  feature: z.string(),
  values: z.record(z.union([z.boolean(), z.string()])),
});
export type PricingComparisonRow = z.infer<typeof PricingComparisonRowSchema>;
