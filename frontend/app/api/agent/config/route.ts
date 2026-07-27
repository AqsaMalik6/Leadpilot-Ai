import { NextResponse } from "next/server";
import { AgentConfigSchema } from "@/lib/schema";
import { updateAgentConfig } from "@/lib/data/agent-config";

export async function PUT(request: Request) {
  const parsed = AgentConfigSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await updateAgentConfig(parsed.data);
    return NextResponse.json({ ok: true, config: updated });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
