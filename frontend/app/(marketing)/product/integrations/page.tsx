import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/fade-in";
import { buildMetadata, breadcrumbJsonLd, siteConfig } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { integrationsFixture } from "@/lib/fixtures/integrations";

export const metadata: Metadata = buildMetadata({
  title: "Integrations Marketplace",
  description:
    "Connect LeadPilot to WhatsApp Business, email, your website form, Calendly, Slack, and HubSpot.",
  path: "/product/integrations",
});

export default function IntegrationsPage() {
  return (
    <div className="section-y">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Product", url: `${siteConfig.url}/product` },
          { name: "Integrations", url: `${siteConfig.url}/product/integrations` },
        ])}
      />
      <div className="container-lp max-w-3xl text-center">
        <FadeIn>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink-950 sm:text-5xl">
            Connects to the tools you already run
          </h1>
          <p className="mt-6 text-slate-500">
            LeadPilot meets your leads where they already are, and hands qualified conversations off
            through the tools your team already uses.
          </p>
        </FadeIn>
      </div>
      <div className="container-lp mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrationsFixture.map((integration, i) => (
          <FadeIn key={integration.id} delay={i * 0.05}>
            <Card className="h-full">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-lg font-semibold text-ink-950">{integration.label}</h2>
                  <Badge variant={integration.status === "connected" ? "qualified" : "neutral"}>
                    {integration.status === "connected" ? "Available today" : "Roadmap"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{integration.description}</p>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
