import type { Metadata } from "next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FadeIn } from "@/components/shared/fade-in";
import { JsonLd } from "@/components/shared/json-ld";
import { buildMetadata, faqPageJsonLd } from "@/lib/seo";
import { faqsFixture } from "@/lib/fixtures/faqs";

export const metadata: Metadata = buildMetadata({
  title: "FAQ — LeadPilot AI",
  description:
    "Answers on response time, supported channels, pricing, security, and setup for LeadPilot AI's autonomous inbound SDR agent.",
  path: "/faq",
});

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  product: "Product",
  pricing: "Pricing & billing",
  security: "Security",
  onboarding: "Onboarding",
};

export default function FaqPage() {
  const categories = Array.from(new Set(faqsFixture.map((f) => f.category)));

  return (
    <div className="section-y">
      <JsonLd data={faqPageJsonLd(faqsFixture)} />
      <div className="container-lp max-w-3xl">
        <FadeIn>
          <h1 className="text-center font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Frequently asked questions
          </h1>
        </FadeIn>
        <div className="mt-12 space-y-10">
          {categories.map((category) => (
            <FadeIn key={category}>
              <h2 className="font-display text-lg font-semibold text-ink-950">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <Accordion type="single" collapsible className="mt-2">
                {faqsFixture
                  .filter((f) => f.category === category)
                  .map((item) => (
                    <AccordionItem key={item.question} value={item.question}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  );
}
