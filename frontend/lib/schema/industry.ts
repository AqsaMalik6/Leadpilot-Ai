import { z } from "zod";
import { ChannelSchema } from "./lead";

export const IndustrySchema = z.object({
  slug: z.string(),
  name: z.string(),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(155),
  heroHeadline: z.string(),
  heroSubhead: z.string(),
  painPoints: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      }),
    )
    .min(3),
  caseStudySlug: z.string().nullable(),
  faqs: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .min(3),
  relevantChannels: z.array(ChannelSchema),
  publishedAt: z.string(),
  updatedAt: z.string(),
});
export type Industry = z.infer<typeof IndustrySchema>;
