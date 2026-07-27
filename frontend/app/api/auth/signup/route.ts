import { NextResponse } from "next/server";
import { SignupInputSchema } from "@/lib/schema";
import { SESSION_COOKIE_NAME, sessionCookieOptions, extractSetCookieValue } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Proxies to the real FastAPI backend — a new organization + owner user actually
// gets written to Postgres here, replacing the old always-succeeds mock.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = SignupInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const backendRes = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  const data = await backendRes.json();

  if (!backendRes.ok || data.ok === false) {
    return NextResponse.json(
      { ok: false, errors: data.errors ?? { formErrors: ["Something went wrong. Please try again."], fieldErrors: {} } },
      { status: backendRes.ok ? 409 : backendRes.status },
    );
  }

  const response = NextResponse.json({ ok: true, user: data.user });
  const token = extractSetCookieValue(backendRes, SESSION_COOKIE_NAME);
  if (token) response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
