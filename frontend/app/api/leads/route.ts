import { NextResponse } from "next/server";
import { getLeads } from "@/lib/data/leads";
import type { LeadFilters } from "@/lib/schema";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters: LeadFilters = {
    status: (searchParams.get("status") as LeadFilters["status"]) || undefined,
    channel: (searchParams.get("channel") as LeadFilters["channel"]) || undefined,
    search: searchParams.get("search") || undefined,
  };

  const leads = await getLeads(filters);
  return NextResponse.json({ leads });
}
