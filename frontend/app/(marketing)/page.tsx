import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/hero-section";
import { TrustBar } from "@/components/marketing/trust-bar";
import { ProblemStats } from "@/components/marketing/problem-stats";
import { HowItWorksTimeline } from "@/components/marketing/how-it-works-timeline";
import { DemoSection } from "@/components/marketing/demo/demo-section";
import { FeatureBentoGrid } from "@/components/marketing/feature-bento-grid";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { IntegrationsStrip } from "@/components/marketing/integrations-strip";
import { SocialProofCarousel } from "@/components/marketing/social-proof-carousel";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { CtaSection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, faqPageJsonLd, howToJsonLd, siteConfig } from "@/lib/seo";
import { faqsFixture } from "@/lib/fixtures/faqs";

export const metadata: Metadata = buildMetadata({
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  path: "/",
  absoluteTitle: true,
});

const homeFaqs = faqsFixture.slice(0, 6);

const howToSteps = [
  { name: "Lead comes in", text: "A website form, WhatsApp message, or email lands in a connected channel." },
  { name: "AI replies instantly", text: "LeadPilot responds in seconds." },
  { name: "AI asks qualifying questions", text: "A short conversation covers budget, timeline, and need." },
  { name: "AI decides", text: "Qualified leads get a Calendly link and a team alert; others close politely." },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqPageJsonLd(homeFaqs)} />
      <JsonLd data={howToJsonLd(howToSteps)} />
      <HeroSection />
      <TrustBar />
      <ProblemStats />
      <HowItWorksTimeline />
      <DemoSection />
      <FeatureBentoGrid />
      <DashboardPreview />
      <IntegrationsStrip />
      <SocialProofCarousel />
      <PricingTeaser />
      <FaqAccordion items={homeFaqs} />
      <CtaSection />
    </>
  );
}
