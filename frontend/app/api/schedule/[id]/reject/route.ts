import { NextResponse } from "next/server";
import { rejectScheduleEvent } from "@/lib/data/schedule";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const result = await rejectScheduleEvent(params.id);
  return NextResponse.json(result);
}
