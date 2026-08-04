import Link from "next/link";
import type { ElementType } from "react";
import { ArrowRight, Globe, Mail } from "lucide-react";
import { FadeIn } from "@/components/shared/fade-in";
import { integrationsFixture } from "@/lib/fixtures/integrations";
import type { IntegrationProvider } from "@/lib/schema";

// Simplified, brand-colored marks (evocative, not traced logos) for the providers Lucide
// doesn't cover — same "stylized SVG per provider" approach already used elsewhere in the
// component library, kept local since this strip is the only consumer.
function WhatsAppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#25D366" />
      <path
        d="M12 6.5a5.5 5.5 0 0 0-4.73 8.3L6.5 17.5l2.8-.74A5.5 5.5 0 1 0 12 6.5Zm3.2 7.86c-.13.37-.76.7-1.05.75-.27.04-.6.06-.97-.06a8.6 8.6 0 0 1-1.36-.5 6.5 6.5 0 0 1-2.42-2.14c-.35-.47-.7-1.03-.78-1.6-.08-.55.13-.9.3-1.08.14-.15.31-.19.42-.19h.3c.1 0 .23-.02.35.27.13.31.44 1.06.48 1.14.04.08.06.17.01.28-.05.1-.08.17-.16.26-.08.1-.17.21-.24.28-.08.08-.16.16-.07.32.1.17.44.72.94 1.16.64.57 1.18.75 1.35.83.17.08.27.07.37-.04.1-.11.42-.48.53-.65.11-.16.22-.13.37-.08.15.06.94.44 1.1.52.16.08.27.12.31.19.04.07.04.4-.09.77Z"
        fill="#fff"
      />
    </svg>
  );
}

function SlackMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8.5 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="#36C5F0" />
      <path d="M9 15.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" fill="#2EB67D" />
      <path d="M14 8.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" fill="#ECB22E" />
      <path d="M15.5 15a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" fill="#E01E5A" />
      <path d="M10 14h4v-1.5a1.5 1.5 0 0 0-1.5-1.5h-1a1.5 1.5 0 0 0-1.5 1.5V14Z" fill="#E01E5A" />
      <path d="M8.5 14a1.5 1.5 0 0 0 1.5 1.5h1.5v-1a1.5 1.5 0 0 0-1.5-1.5H8.5v1Z" fill="#ECB22E" />
      <path d="M15.5 10a1.5 1.5 0 0 0-1.5-1.5H12.5v4a1.5 1.5 0 0 0 1.5 1.5h1.5v-4Z" fill="#36C5F0" />
      <path d="M14 8.5a1.5 1.5 0 0 0-1.5-1.5h-1v4a1.5 1.5 0 0 0 1.5 1.5h1v-4Z" fill="#2EB67D" />
    </svg>
  );
}

function HubSpotMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#FF7A59" />
      <path
        d="M15.2 10.95V9.3a1.35 1.35 0 1 0-1.3 0v1.65a3.1 3.1 0 0 0-1.47.77l-4.2-3.18c.03-.12.04-.25.04-.38a1.45 1.45 0 1 0-1.45 1.45c.28 0 .54-.08.76-.2l4.14 3.13a3.15 3.15 0 0 0-.06.6c0 .32.05.62.14.9l-1.27.96a1.15 1.15 0 1 0 .7.94l1.2-.9c.53.5 1.24.8 2.02.8a3.1 3.1 0 1 0 .95-6.06Zm-.65 4.7a1.65 1.65 0 1 1 0-3.3 1.65 1.65 0 0 1 0 3.3Z"
        fill="#fff"
      />
    </svg>
  );
}

function CalendlyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#006BFF" />
      <rect x="7" y="7.5" width="10" height="9" rx="2" fill="none" stroke="#fff" strokeWidth="1.4" />
      <path d="M9 7.5V6.3M15 7.5V6.3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M9.3 12.2l1.7 1.7 3.4-3.6"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const PROVIDER_ICON: Record<IntegrationProvider, ElementType> = {
  website_form: Globe,
  email: Mail,
  calendly: CalendlyMark,
  whatsapp: WhatsAppMark,
  slack: SlackMark,
  hubspot: HubSpotMark,
  // Not in this marketing marquee's fixture data today — present only so this Record
  // stays exhaustive against IntegrationProviderSchema (SKILL-MULTI-TENANT-CONNECT.md).
  gmail: Mail,
  whatsapp_qr: WhatsAppMark,
};

const MARQUEE_ITEMS = [...integrationsFixture, ...integrationsFixture];

export function IntegrationsStrip() {
  return (
    <section className="section-y">
      <div className="container-lp">
        <FadeIn>
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Connects to the tools you already run
            </h2>

            <div className="relative w-full overflow-hidden">
              <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
                {MARQUEE_ITEMS.map((integration, i) => {
                  const Icon = PROVIDER_ICON[integration.provider];
                  return (
                    <span
                      key={`${integration.id}-${i}`}
                      aria-hidden={i >= integrationsFixture.length}
                      className="flex flex-shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-950"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-ink-950/70" />
                      {integration.label}
                    </span>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent sm:w-24" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent sm:w-24" />
            </div>

            <Link
              href="/product/integrations"
              className="inline-flex items-center gap-1 text-sm font-medium text-signal-600 hover:underline"
            >
              See all integrations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
