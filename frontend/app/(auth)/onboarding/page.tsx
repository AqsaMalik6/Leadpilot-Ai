import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/auth/onboarding/onboarding-wizard";
import { getAgentConfig } from "@/lib/data/agent-config";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Get Set Up",
  description: "Connect your first lead channel and send a test lead through LeadPilot AI.",
  path: "/onboarding",
  noIndex: true,
});

export default async function OnboardingPage() {
  const initialConfig = await getAgentConfig();
  return <OnboardingWizard initialConfig={initialConfig} />;
}
