import { SESSION_COOKIE_NAME } from "@/lib/constants";

// Real session mechanics: the session_id cookie's value is an opaque, signed token
// issued by the FastAPI backend (itsdangerous), not something this app can decode
// itself. middleware.ts verifies it against the backend and forwards the resolved
// user via an x-lp-user request header for Server Components to read directly —
// see "Integration model" in backend/SKILL-BACKEND.md. Route handlers below (auth
// proxies) use cookieHeaderFor()/extractSetCookieValue() to pass the token through
// to the backend server-to-server.

export { SESSION_COOKIE_NAME };

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

// Pulls the named cookie's value back out of a backend Response's Set-Cookie
// header(s), so a route handler can re-issue it as this app's own cookie.
export function extractSetCookieValue(res: Response, name: string): string | null {
  const headers = res.headers as unknown as { getSetCookie?: () => string[]; get(key: string): string | null };
  const lines = headers.getSetCookie ? headers.getSetCookie() : [headers.get("set-cookie") ?? ""];
  for (const line of lines) {
    const match = line.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    if (match) return match[1] ?? null;
  }
  return null;
}

export function cookieHeaderFor(token: string): { Cookie: string } {
  return { Cookie: `${SESSION_COOKIE_NAME}=${token}` };
}
