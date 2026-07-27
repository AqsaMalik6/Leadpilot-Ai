import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend-fetch";

const BodySchema = z.object({ name: z.string().min(2).optional() });

export async function PUT(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }
  const res = await backendFetch("/api/org/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
