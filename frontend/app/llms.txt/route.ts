import { siteConfig } from "@/lib/seo";
import { industriesFixture } from "@/lib/fixtures/industries";
import { blogPostsFixture } from "@/lib/fixtures/blog-posts";

// Curated plain-text index for LLM/agent crawlers (SKILL-FRONTEND.md §5.4) — not a
// Google ranking factor, but a low-cost signal several answer engines consume.
export async function GET() {
  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.tagline}. ${siteConfig.description}`,
    "",
    "## Core pages",
    `- [Home](${siteConfig.url}/): Instant AI SDR reply, qualification, and booking overview.`,
    `- [How it works](${siteConfig.url}/how-it-works): The 4-step inbound qualification flow.`,
    `- [Product](${siteConfig.url}/product): Full agent capability breakdown.`,
    `- [Pricing](${siteConfig.url}/pricing): Plans and feature comparison.`,
    `- [Live demo](${siteConfig.url}/demo): Submit a sandbox lead and watch the agent qualify it live.`,
    `- [Security](${siteConfig.url}/security): Current data-handling and compliance posture.`,
    "",
    "## Solutions by industry",
    ...industriesFixture.map((i) => `- [${i.name}](${siteConfig.url}/solutions/${i.slug}): ${i.metaDescription}`),
    "",
    "## Recent blog posts",
    ...blogPostsFixture.map((p) => `- [${p.title}](${siteConfig.url}/blog/${p.slug}): ${p.metaDescription}`),
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
