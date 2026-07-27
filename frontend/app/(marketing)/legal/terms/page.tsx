import type { Metadata } from "next";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "The terms governing use of the LeadPilot AI product and website.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-2xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>
          <div className="prose prose-slate mt-10 max-w-none">
            <p>
              These terms govern your use of LeadPilot AI&apos;s website and product.{" "}
              <em>This is a template draft pending review by qualified legal counsel before
              production launch — do not rely on it as final legal advice.</em>
            </p>
            <h2>Use of the service</h2>
            <p>
              You may use LeadPilot to reply to and qualify inbound leads on behalf of your
              organization. You&apos;re responsible for the accuracy of qualifying questions and
              guardrail configuration you set for your agent.
            </p>
            <h2>Acceptable use</h2>
            <p>
              You agree not to use LeadPilot to send unsolicited outbound messages, to misrepresent
              the agent as a human where prohibited by law, or to process categories of data our
              plans don&apos;t support without informing us first.
            </p>
            <h2>Billing</h2>
            <p>
              Plans are billed monthly or annually as selected at signup. Usage beyond your
              plan&apos;s included lead volume may incur overage charges, disclosed before being
              applied.
            </p>
            <h2>Termination</h2>
            <p>
              Either party may terminate at any time. Upon termination, your data is retained for a
              limited period for export purposes, then deleted per our privacy policy.
            </p>
            <h2>Disclaimers</h2>
            <p>
              LeadPilot is provided &quot;as is.&quot; We do not guarantee any specific conversion,
              booking, or revenue outcome from use of the product.
            </p>
            <h2>Contact</h2>
            <p>
              Questions about these terms can be sent through our <a href="/contact">contact page</a>.
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
