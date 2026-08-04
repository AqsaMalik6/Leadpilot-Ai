import { NextResponse } from "next/server";
import { getScheduleEvents } from "@/lib/data/schedule";

export async function GET() {
  const events = await getScheduleEvents();
  return NextResponse.json({ events });
}
