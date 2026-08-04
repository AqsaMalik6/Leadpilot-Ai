import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

// Client components (the Integrations page's pending-replies panel) can't call
// backendFetch directly (it needs next/headers, server-only) — same reason
// /api/integrations/route.ts exists.
export async function GET() {
  const res = await backendFetch("/api/gmail/pending-replies");
  if (!res.ok) return NextResponse.json({ pendingReplies: [] }, { status: res.status });
  return NextResponse.json(await res.json());
}
