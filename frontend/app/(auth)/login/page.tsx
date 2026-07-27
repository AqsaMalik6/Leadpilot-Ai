import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { BackgroundWords } from "@/components/auth/background-words";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Log In",
  description: "Log in to your LeadPilot AI dashboard.",
  path: "/login",
  noIndex: true,
});

export default function LoginPage() {
  return (
    <>
      <BackgroundWords />
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}
