import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend-fetch";

const BodySchema = z.object({ email: z.string().email(), role: z.enum(["admin", "sales_rep"]).optional() });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }
  const res = await backendFetch("/api/team/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return NextResponse.json({ ok: false, errors: data?.errors }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
