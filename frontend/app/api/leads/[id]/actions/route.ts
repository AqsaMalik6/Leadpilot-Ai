import { NextResponse } from "next/server";
import { getLeadActions } from "@/lib/data/leads";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const actions = await getLeadActions(params.id);
  return NextResponse.json({ actions });
}
