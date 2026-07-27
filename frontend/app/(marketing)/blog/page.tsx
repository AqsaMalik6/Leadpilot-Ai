import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";
import { blogPostsFixture } from "@/lib/fixtures/blog-posts";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Blog — AI SDR & Inbound Lead Response",
  description:
    "Practical writing on AI SDRs, inbound lead response time, qualification, and building guardrails for autonomous sales agents.",
  path: "/blog",
});

export default function BlogIndexPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-3xl text-center">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            The LeadPilot Blog
          </h1>
          <p className="mt-6 text-slate-500">
            Practical, specific writing on inbound response time, qualification, and how we build
            guardrails for an autonomous sales agent.
          </p>
        </FadeIn>
      </div>
      <div className="container-lp mt-12 grid gap-6 md:grid-cols-2">
        {blogPostsFixture.map((post, i) => (
          <FadeIn key={post.slug} delay={i * 0.05}>
            <Link
              href={`/blog/${post.slug}`}
              className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold text-ink-950">{post.title}</h2>
              <p className="mt-2 flex-1 text-sm text-slate-500">{post.tldr}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {post.author.name} · {formatDate(post.publishedAt)} · {post.readingTimeMinutes} min read
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
