import type { Metadata } from "next";
import { ContactForm } from "@/components/marketing/contact-form";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description: "Talk to the LeadPilot AI team about your inbound lead volume and setup.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-4 text-slate-500">
            Questions about setup, enterprise plans, or anything else — we usually reply within one
            business day.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="mt-10">
            <ContactForm />
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
