import { NextResponse } from "next/server";
import { deleteLead, getLeadById } from "@/lib/data/leads";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const lead = await getLeadById(params.id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const result = await deleteLead(params.id);
  return NextResponse.json(result);
}
