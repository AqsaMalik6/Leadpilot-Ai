import { NextResponse } from "next/server";
import { deleteOutboundLead } from "@/lib/data/outbound-leads";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await deleteOutboundLead(params.id);
  return NextResponse.json({ ok: true });
}
