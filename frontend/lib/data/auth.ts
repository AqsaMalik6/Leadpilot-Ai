import type { SessionUser, LoginInput, SignupInput } from "@/lib/schema";

// Mock auth data layer — see SKILL-FRONTEND.md §4.6. Any well-formed input succeeds;
// there is no real credential store yet. Session state itself lives in the
// httpOnly cookie set by app/api/auth/* route handlers, not here.

export async function mockLogin(input: LoginInput): Promise<SessionUser> {
  return {
    id: "user_demo",
    orgId: "org_demo",
    name: input.email.split("@")[0] ?? "there",
    email: input.email,
    role: "owner",
    onboardingCompletedAt: "2026-06-01T00:00:00Z",
  };
}

export async function mockSignup(input: SignupInput): Promise<SessionUser> {
  return {
    id: "user_new",
    orgId: "org_new",
    name: input.name,
    email: input.email,
    role: "owner",
    onboardingCompletedAt: null,
  };
}
