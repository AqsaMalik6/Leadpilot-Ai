import { NextResponse } from "next/server";
import { generateProposal } from "@/lib/data/leads";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const proposal = await generateProposal(params.id);
  return NextResponse.json({ proposal });
}
