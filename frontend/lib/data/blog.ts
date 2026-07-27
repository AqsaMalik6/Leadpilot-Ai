import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  blogPostsFixture,
  getBlogPostBySlug as getBySlug,
  getRelatedPosts as getRelated,
} from "@/lib/fixtures/blog-posts";
import { renderMarkdownToHtml } from "@/lib/markdown";
import type { BlogPost } from "@/lib/schema";

export async function getBlogPosts(): Promise<BlogPost[]> {
  return blogPostsFixture.slice().sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  return getBySlug(slug);
}

export async function getRelatedPosts(post: BlogPost): Promise<BlogPost[]> {
  return getRelated(post);
}

export async function getBlogPostBodyHtml(post: BlogPost): Promise<string> {
  const raw = await readFile(path.join(process.cwd(), post.bodyMdxPath), "utf-8");
  return renderMarkdownToHtml(raw);
}
