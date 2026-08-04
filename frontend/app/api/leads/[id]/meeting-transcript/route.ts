import { NextResponse } from "next/server";
import { setMeetingTranscript } from "@/lib/data/leads";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const result = await setMeetingTranscript(params.id, body.transcript ?? "");
  return NextResponse.json(result);
}
