import { NextResponse } from "next/server";
import { getOutboundLeads } from "@/lib/data/outbound-leads";

export async function GET() {
  const leads = await getOutboundLeads();
  return NextResponse.json({ leads });
}
