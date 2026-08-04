import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend-fetch";

// GET, not a fetch-and-forward: the browser must do a real top-level navigation so
// the eventual Google -> backend -> here redirect chain works. This route's own job
// is just the part that NEEDS the session cookie (resolving org_id) before handing
// off to a real browser redirect to Google.
export async function GET(request: Request) {
  const res = await backendFetch("/api/integrations/gmail/start");
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.redirect(new URL(`/dashboard/integrations?gmail=error&reason=${encodeURIComponent(detail)}`, request.url));
  }
  const { authUrl } = await res.json();
  return NextResponse.redirect(authUrl);
}
