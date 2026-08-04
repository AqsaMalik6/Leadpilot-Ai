import { NextResponse, type NextRequest } from "next/server";
// Relative import, not the "@/" alias — Vercel's Edge Function bundler fails to trace
// that alias for middleware specifically (a known Next.js/Vercel gotcha), even though
// it resolves fine everywhere else in the app.
import { SESSION_COOKIE_NAME } from "./lib/constants";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/checkout"];
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Real auth gate: verifies the session_id cookie against the backend (not just
// presence) and forwards the resolved user as a request header, so downstream
// Server Components can read it synchronously instead of re-fetching — see
// app/(app)/layout.tsx for why the fetch can't safely live there instead.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const data = await res.json();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-lp-user", JSON.stringify(data.user));
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/checkout/:path*"],
};
