import { NextResponse } from "next/server";
import { LeadStatusSchema } from "@/lib/schema";
import { updateLeadStatus } from "@/lib/data/leads";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const parsed = LeadStatusSchema.safeParse(body.status);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  await updateLeadStatus(params.id, parsed.data);
  return NextResponse.json({ ok: true });
}
