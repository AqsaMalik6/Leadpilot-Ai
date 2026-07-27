import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/backend-fetch";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const res = await fetch(`${API_BASE_URL}/api/demo/lead/${params.id}`, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
