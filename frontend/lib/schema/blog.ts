import { z } from "zod";

export const AuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  avatarSrc: z.string(),
  bio: z.string(),
});
export type Author = z.infer<typeof AuthorSchema>;

export const BlogPostSchema = z.object({
  slug: z.string(),
  title: z.string(),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(155),
  tldr: z.string(),
  bodyMdxPath: z.string(),
  author: AuthorSchema,
  publishedAt: z.string(),
  updatedAt: z.string(),
  tags: z.array(z.string()),
  coverImageSrc: z.string(),
  readingTimeMinutes: z.number(),
  faqs: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    )
    .optional(),
  relatedSlugs: z.array(z.string()).max(3),
});
export type BlogPost = z.infer<typeof BlogPostSchema>;
