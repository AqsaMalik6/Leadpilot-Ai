import { NextResponse } from "next/server";
import { DemoLeadInputSchema } from "@/lib/schema";
import { API_BASE_URL } from "@/lib/backend-fetch";

// Public, unauthenticated — proxies to the real Groq-powered pipeline against the
// seeded demo sandbox org (backend enforces is_demo=true, no session needed).
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = DemoLeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const res = await fetch(`${API_BASE_URL}/api/demo/lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: res.status });
  }
  return NextResponse.json(await res.json(), { status: 202 });
}
