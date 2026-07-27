import { NextResponse } from "next/server";
import { approveProposal } from "@/lib/data/leads";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const result = await approveProposal(params.id);
  return NextResponse.json(result);
}
