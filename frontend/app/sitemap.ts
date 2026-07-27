import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo";
import { industriesFixture } from "@/lib/fixtures/industries";
import { comparisonsFixture } from "@/lib/fixtures/comparisons";
import { blogPostsFixture } from "@/lib/fixtures/blog-posts";
import { caseStudiesFixture } from "@/lib/fixtures/testimonials";

const STATIC_ROUTES = [
  "",
  "/how-it-works",
  "/product",
  "/product/qualification",
  "/product/integrations",
  "/pricing",
  "/customers",
  "/blog",
  "/faq",
  "/about",
  "/contact",
  "/security",
  "/legal/privacy",
  "/legal/terms",
  "/login",
  "/signup",
  "/demo",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const industryEntries: MetadataRoute.Sitemap = industriesFixture.map((industry) => ({
    url: `${siteConfig.url}/solutions/${industry.slug}`,
    lastModified: new Date(industry.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const comparisonEntries: MetadataRoute.Sitemap = comparisonsFixture.map((comparison) => ({
    url: `${siteConfig.url}/compare/${comparison.slug}`,
    lastModified: new Date(comparison.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogPostsFixture.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const caseStudyEntries: MetadataRoute.Sitemap = caseStudiesFixture.map((cs) => ({
    url: `${siteConfig.url}/customers/${cs.slug}`,
    lastModified: new Date(cs.publishedAt),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...industryEntries, ...comparisonEntries, ...blogEntries, ...caseStudyEntries];
}
