import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";
import { BackgroundWords } from "@/components/auth/background-words";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Start Your Free Trial",
  description: "Create a LeadPilot AI account — no credit card required.",
  path: "/signup",
  noIndex: true,
});

export default function SignupPage() {
  return (
    <>
      <BackgroundWords />
      <SignupForm />
    </>
  );
}
