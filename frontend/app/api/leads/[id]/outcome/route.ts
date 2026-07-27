import { NextResponse } from "next/server";
import { setLeadOutcome } from "@/lib/data/leads";
import type { Outcome } from "@/lib/schema";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const result = await setLeadOutcome(params.id, body.outcome as Outcome, body.reason);
  return NextResponse.json(result);
}
