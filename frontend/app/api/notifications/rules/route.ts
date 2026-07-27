import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

// Backend's rules endpoint is an intentional no-op stub today (Phase 1 triggers
// are fixed/always-on) — this still hits the real network rather than faking it
// locally, and is ready to start persisting the moment the backend adds a table.
export async function PUT(request: Request) {
  const body = await request.json();
  const res = await backendFetch("/api/notifications/rules", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
