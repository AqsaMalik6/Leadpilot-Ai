import { NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/data/kpi";

export async function GET() {
  const overview = await getDashboardOverview();
  return NextResponse.json(overview);
}
