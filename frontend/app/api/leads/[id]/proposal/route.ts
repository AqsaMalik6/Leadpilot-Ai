import { NextResponse } from "next/server";
import { editProposal, getProposal } from "@/lib/data/leads";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const proposal = await getProposal(params.id);
  return NextResponse.json({ proposal });
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const proposal = await editProposal(params.id, body);
  return NextResponse.json({ proposal });
}
