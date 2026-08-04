import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

// Dummy billing only (no real Stripe account behind this product) — see
// backend/app/routers/billing.py and app/services/billing_service.py. Whatever
// plan is submitted here is accepted and applied to the org immediately, for real,
// via a real DB write; there's just no real payment network involved.
export async function POST(request: Request) {
  const body = await request.json();
  const res = await backendFetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ ok: false }, { status: res.status });
  return NextResponse.json(await res.json());
}
