import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE_NAME, cookieHeaderFor } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const StepSchema = z.object({ step: z.number().min(1).max(4) });
const CompleteSchema = z.object({ complete: z.literal(true) });

// Proxies onboarding progress to the real backend (users.onboarding_step /
// onboarding_completed_at in Postgres) — replaces the old throwaway cookie.
export async function GET() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ step: 1 });

  const backendRes = await fetch(`${API_BASE_URL}/api/onboarding/status`, {
    headers: cookieHeaderFor(token),
    cache: "no-store",
  });
  if (!backendRes.ok) return NextResponse.json({ step: 1 });
  return NextResponse.json(await backendRes.json());
}

export async function POST(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json();

  const completeParsed = CompleteSchema.safeParse(body);
  if (completeParsed.success) {
    const backendRes = await fetch(`${API_BASE_URL}/api/onboarding/complete`, {
      method: "POST",
      headers: cookieHeaderFor(token),
    });
    if (!backendRes.ok) return NextResponse.json({ ok: false }, { status: backendRes.status });
    return NextResponse.json(await backendRes.json());
  }

  const stepParsed = StepSchema.safeParse(body);
  if (!stepParsed.success) {
    return NextResponse.json({ ok: false, errors: stepParsed.error.flatten() }, { status: 400 });
  }

  const backendRes = await fetch(`${API_BASE_URL}/api/onboarding/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cookieHeaderFor(token) },
    body: JSON.stringify(stepParsed.data),
  });
  if (!backendRes.ok) return NextResponse.json({ ok: false }, { status: backendRes.status });
  return NextResponse.json(await backendRes.json());
}
