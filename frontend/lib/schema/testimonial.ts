import { z } from "zod";

export const TestimonialSchema = z.object({
  id: z.string(),
  quote: z.string(),
  authorName: z.string(),
  authorTitle: z.string(),
  companyName: z.string(),
  companyLogoSrc: z.string().nullable(),
  avatarSrc: z.string().nullable(),
  metricCallout: z.string().nullable(),
  isIllustrative: z.boolean(),
});
export type Testimonial = z.infer<typeof TestimonialSchema>;

export const CaseStudySchema = z.object({
  slug: z.string(),
  companyName: z.string(),
  industry: z.string(),
  summary: z.string(),
  metrics: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  narrative: z.string(),
  quote: TestimonialSchema.optional(),
  isIllustrative: z.boolean(),
  publishedAt: z.string(),
});
export type CaseStudy = z.infer<typeof CaseStudySchema>;
