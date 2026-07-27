import { NextResponse } from "next/server";
import { z } from "zod";
import { backendFetch } from "@/lib/backend-fetch";

const BodySchema = z.object({ channelType: z.string(), config: z.record(z.unknown()).optional() });

// Backend's onboarding router uses plain (non-camelCase) Pydantic models here —
// translate to its snake_case field name before forwarding.
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const res = await backendFetch("/api/onboarding/channel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_type: parsed.data.channelType, config: parsed.data.config ?? {} }),
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
