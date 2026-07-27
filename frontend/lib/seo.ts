import type { Metadata } from "next";

export const siteConfig = {
  name: "LeadPilot AI",
  category: "AI SDR / AI Sales Qualification Agent",
  tagline: "Your AI SDR replies to every lead in under 10 seconds",
  description:
    "LeadPilot AI is an autonomous AI Sales Development Rep that replies to inbound leads instantly, qualifies them against your criteria, and books the call — so no lead goes cold waiting on a human.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function buildMetadata({
  title,
  description,
  path = "",
  noIndex = false,
  absoluteTitle = false,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  /** Bypass the root layout's "%s | LeadPilot AI" template — for pages (like Home)
   * whose title is already the full brand-inclusive string. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
  };
}

export function faqPageJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function howToJsonLd(steps: { name: string; text: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How LeadPilot AI qualifies an inbound lead",
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

export function articleJsonLd({
  title,
  description,
  authorName,
  datePublished,
  dateModified,
  url,
}: {
  title: string;
  description: string;
  authorName: string;
  datePublished: string;
  dateModified: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    author: { "@type": "Person", name: authorName },
    datePublished,
    dateModified,
    mainEntityOfPage: url,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function offerJsonLd(tiers: { name: string; priceCents: number | null }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${siteConfig.name} subscription`,
    offers: tiers
      .filter((t) => t.priceCents !== null)
      .map((t) => ({
        "@type": "Offer",
        name: t.name,
        priceCurrency: "USD",
        price: ((t.priceCents ?? 0) / 100).toFixed(2),
      })),
  };
}
