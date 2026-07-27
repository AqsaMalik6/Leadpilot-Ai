import { NextResponse } from "next/server";
import { ContactInputSchema } from "@/lib/schema";
import { API_BASE_URL } from "@/lib/backend-fetch";

// Public — no session cookie needed, persists to contact_submissions + emails
// the team (or console-logs if no email provider key is set).
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ContactInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const res = await fetch(`${API_BASE_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!res.ok) {
    return NextResponse.json({ ok: false }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
