import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const res = await backendFetch(`/api/team/${params.id}`, { method: "DELETE" });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json({ ok: true });
}
