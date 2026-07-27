import { NextResponse } from "next/server";
import { getProposal } from "@/lib/data/leads";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const proposal = await getProposal(params.id);
  return NextResponse.json({ proposal });
}
