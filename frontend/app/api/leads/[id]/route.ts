import { NextResponse } from "next/server";
import { getLeadById } from "@/lib/data/leads";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const lead = await getLeadById(params.id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead });
}
