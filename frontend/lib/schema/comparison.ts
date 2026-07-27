import { z } from "zod";

export const ComparisonFeatureRowSchema = z.object({
  feature: z.string(),
  leadPilot: z.union([z.boolean(), z.string()]),
  competitor: z.union([z.boolean(), z.string()]),
  note: z.string().optional(),
});
export type ComparisonFeatureRow = z.infer<typeof ComparisonFeatureRowSchema>;

export const ComparisonSchema = z.object({
  slug: z.string(),
  competitorName: z.string(),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(155),
  intro: z.string(),
  featureRows: z.array(ComparisonFeatureRowSchema).min(5),
  whenToChooseLeadPilot: z.array(z.string()),
  whenToChooseCompetitor: z.array(z.string()),
  faqs: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
  updatedAt: z.string(),
});
export type Comparison = z.infer<typeof ComparisonSchema>;
