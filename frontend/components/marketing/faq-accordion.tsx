import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FadeIn } from "@/components/shared/fade-in";
import type { FaqItem } from "@/lib/fixtures/faqs";

export function FaqAccordion({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  return (
    <section className="section-y bg-surface-2">
      <div className="container-lp max-w-3xl">
        <FadeIn>
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            {title}
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <Accordion type="single" collapsible className="mt-10">
            {items.map((item) => (
              <AccordionItem key={item.question} value={item.question}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </div>
    </section>
  );
}
