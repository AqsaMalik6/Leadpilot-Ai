import { backendFetch } from "@/lib/backend-fetch";

// Proxies the real backend's Postgres LISTEN/NOTIFY-backed SSE stream straight
// through — server-to-server, forwarding the session cookie, piping the body
// unmodified rather than re-encoding events here.
export const dynamic = "force-dynamic";

export async function GET() {
  const backendRes = await backendFetch("/api/leads/stream");

  if (!backendRes.ok || !backendRes.body) {
    return new Response("event: error\ndata: {}\n\n", {
      status: backendRes.status || 502,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  return new Response(backendRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
