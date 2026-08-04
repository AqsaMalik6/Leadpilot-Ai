import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const res = await backendFetch(`/api/gmail/pending-replies/${params.id}/approve`, { method: "POST" });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
