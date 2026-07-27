import type { Metadata } from "next";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How LeadPilot AI collects, uses, and protects data from visitors and customers.",
  path: "/legal/privacy",
  noIndex: false,
});

export default function PrivacyPage() {
  return (
    <div className="section-y">
      <div className="container-lp max-w-2xl">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: July 2026</p>
          <div className="prose prose-slate mt-10 max-w-none">
            <p>
              This policy describes how LeadPilot AI (&quot;LeadPilot,&quot; &quot;we,&quot;
              &quot;us&quot;) collects, uses, and shares information when you visit our website, use
              our product, or interact with our AI SDR agent as an inbound lead.
              <em> This is a template draft pending review by qualified legal counsel before
              production launch — do not rely on it as final legal advice.</em>
            </p>
            <h2>Information we collect</h2>
            <ul>
              <li>Account information you provide at signup (name, company, email).</li>
              <li>
                Lead and conversation data submitted through your connected channels (website
                form, WhatsApp, email) when your organization uses LeadPilot to reply to inbound
                leads.
              </li>
              <li>Usage data (pages visited, features used) for product analytics, only after cookie consent is granted.</li>
            </ul>
            <h2>How we use information</h2>
            <p>
              We use collected information to operate the product (routing and qualifying leads on
              your behalf), to improve our service, and to communicate with you about your account.
              We do not sell lead or customer data.
            </p>
            <h2>Data retention</h2>
            <p>
              Organizations can request export or deletion of their data at any time via account
              settings or by contacting us.
            </p>
            <h2>Third parties</h2>
            <p>
              We share data with subprocessors strictly necessary to operate the product (e.g.
              inference providers, calendar and messaging integrations you connect), under contracts
              requiring equivalent protection.
            </p>
            <h2>Contact</h2>
            <p>
              Questions about this policy can be sent through our <a href="/contact">contact page</a>.
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
