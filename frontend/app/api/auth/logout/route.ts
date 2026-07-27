import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, cookieHeaderFor } from "@/lib/session";
import { OVERLAY_COOKIE_NAME } from "@/lib/constants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Revokes the session row server-side (a stolen cookie should be revocable), then
// clears the browser cookies regardless of whether the backend call succeeds.
export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: cookieHeaderFor(token),
      });
    } catch {
      // best-effort — still clear the local cookie below
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(OVERLAY_COOKIE_NAME);
  return response;
}
