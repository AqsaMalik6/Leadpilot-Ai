import { NextResponse } from "next/server";
import { searchOutboundLeads } from "@/lib/data/outbound-leads";

export async function POST(request: Request) {
  const body = await request.json();
  try {
    const leads = await searchOutboundLeads(body.category, body.location, body.maxResults ?? 15);
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json({ detail: err instanceof Error ? err.message : "Search failed" }, { status: 502 });
  }
}
