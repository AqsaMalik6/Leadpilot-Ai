import { NextResponse } from "next/server";
import { DemoLeadInputSchema } from "@/lib/schema";
import { backendFetch } from "@/lib/backend-fetch";

// Authenticated — fires a real lead through the org's own agent_configs row via
// the live Groq pipeline (used by onboarding step 4, not the public /demo page).
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = DemoLeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const res = await backendFetch("/api/onboarding/test-lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: 202 });
}
