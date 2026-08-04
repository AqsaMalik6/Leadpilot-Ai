import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

export async function POST() {
  const res = await backendFetch("/api/integrations/whatsapp/connect", { method: "POST" });
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json({ ok: false, detail }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
