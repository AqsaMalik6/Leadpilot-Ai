import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

// Public, unauthenticated — this is the real link a customer's own website form
// posts to. Same-origin passthrough of the backend's real intake endpoint
// (app/routers/intake.py's web_form_intake) so the link we hand out lives on this
// app's own domain instead of exposing the backend's raw host/port.
export async function POST(request: Request, { params }: { params: { formKey: string } }) {
  const body = await request.text();
  const res = await backendFetch(`/api/intake/web-form/${params.formKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } });
}
