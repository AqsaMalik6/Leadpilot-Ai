import { NextResponse } from "next/server";
import { LoginInputSchema } from "@/lib/schema";
import { SESSION_COOKIE_NAME, sessionCookieOptions, extractSetCookieValue } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Proxies to the real FastAPI backend (server-to-server) and forwards its signed
// session_id cookie back to the browser — replaces the old accept-anything mock.
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LoginInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const backendRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  const data = await backendRes.json();

  if (!backendRes.ok || data.ok === false) {
    return NextResponse.json(
      { ok: false, errors: data.errors ?? { formErrors: ["Invalid email or password"], fieldErrors: {} } },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, user: data.user });
  const token = extractSetCookieValue(backendRes, SESSION_COOKIE_NAME);
  if (token) response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
