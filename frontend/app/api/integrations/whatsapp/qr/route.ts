import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

export async function GET() {
  const res = await backendFetch("/api/integrations/whatsapp/qr");
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
