import { NextResponse } from "next/server";
import { approveScheduleEvent } from "@/lib/data/schedule";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const result = await approveScheduleEvent(params.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
