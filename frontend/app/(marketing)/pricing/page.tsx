import type { Metadata } from "next";
import { PricingPageContent } from "@/components/marketing/pricing-page-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Plans for Every Lead Volume",
  description:
    "LeadPilot AI pricing starts at $199/mo. Compare Starter, Growth, Scale, and Enterprise plans and see exactly what's included.",
  path: "/pricing",
});

export default function PricingPage() {
  return <PricingPageContent />;
}
