import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// Shared server-to-server call to the real FastAPI backend, forwarding the
// caller's session_id cookie. Safe to use from lib/data/* (Server Components)
// and from app/api/**/route.ts proxies alike — do NOT call redirect() right
// after this in the same function (see app/(app)/layout.tsx for why).
export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Cookie", `${SESSION_COOKIE_NAME}=${token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
}

export { API_BASE_URL };
