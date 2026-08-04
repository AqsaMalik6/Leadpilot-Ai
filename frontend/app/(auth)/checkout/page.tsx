import type { Metadata } from "next";
import { CheckoutForm } from "@/components/auth/checkout-form";
import { pricingTiersFixture } from "@/lib/fixtures/pricing";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Confirm your plan",
  description: "Confirm your LeadPilot AI plan before setup.",
  path: "/checkout",
  noIndex: true,
});

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const tier = pricingTiersFixture.find((t) => t.id === plan) ?? pricingTiersFixture.find((t) => t.id === "starter")!;
  return <CheckoutForm tier={tier} />;
}
