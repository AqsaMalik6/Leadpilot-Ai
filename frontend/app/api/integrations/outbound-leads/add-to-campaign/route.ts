import { NextResponse } from "next/server";
import { addOutboundLeadsToCampaign } from "@/lib/data/outbound-leads";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const result = await addOutboundLeadsToCampaign(body.leadIds ?? []);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ detail: err instanceof Error ? err.message : "Failed to add leads" }, { status: 502 });
  }
}
