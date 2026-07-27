import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, articleJsonLd, breadcrumbJsonLd, faqPageJsonLd, siteConfig } from "@/lib/seo";
import { blogPostsFixture, getBlogPostBySlug, getRelatedPosts } from "@/lib/fixtures/blog-posts";
import { getBlogPostBodyHtml } from "@/lib/data/blog";
import { formatDate } from "@/lib/utils";

export function generateStaticParams() {
  return blogPostsFixture.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPostBySlug(params.slug);
  if (!post) return {};
  return buildMetadata({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const bodyHtml = await getBlogPostBodyHtml(post);
  const related = getRelatedPosts(post);

  return (
    <article className="section-y">
      <JsonLd
        data={articleJsonLd({
          title: post.title,
          description: post.metaDescription,
          authorName: post.author.name,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          url: `${siteConfig.url}/blog/${post.slug}`,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Blog", url: `${siteConfig.url}/blog` },
          { name: post.title, url: `${siteConfig.url}/blog/${post.slug}` },
        ])}
      />
      {post.faqs && <JsonLd data={faqPageJsonLd(post.faqs)} />}

      <div className="container-lp max-w-2xl">
        <FadeIn>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-slate-500">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {post.author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium text-ink-950">{post.author.name}</div>
              <div className="text-slate-500">
                {post.author.title} · {formatDate(post.publishedAt)} · {post.readingTimeMinutes} min read
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-signal-500/30 bg-signal-500/5 p-5 text-sm text-ink-950">
            <span className="font-semibold text-signal-600">TL;DR — </span>
            {post.tldr}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div
            className="prose prose-slate mt-10 max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </FadeIn>

        {post.faqs && (
          <FadeIn delay={0.15}>
            <div className="mt-12">
              <h2 className="font-display text-xl font-semibold text-ink-950">FAQ</h2>
              <Accordion type="single" collapsible className="mt-4">
                {post.faqs.map((faq) => (
                  <AccordionItem key={faq.question} value={faq.question}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </FadeIn>
        )}

        <p className="mt-10 text-xs text-slate-400">Last updated {formatDate(post.updatedAt)}</p>

        {related.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="mt-14 border-t border-line pt-8">
              <h2 className="font-display text-lg font-semibold text-ink-950">Related articles</h2>
              <ul className="mt-4 space-y-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/blog/${r.slug}`} className="text-sm font-medium text-signal-600 hover:underline">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        )}
      </div>
    </article>
  );
}
