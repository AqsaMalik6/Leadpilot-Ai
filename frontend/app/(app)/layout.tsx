import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { LiveLeadToaster } from "@/components/dashboard/live-lead-toaster";
import type { SessionUser } from "@/lib/schema";

// Auth is actually enforced in middleware.ts (verifies session_id against the
// backend before any request reaches here). This just reads the user middleware
// already resolved, via a forwarded header — no fetch here, since an awaited
// cross-origin fetch followed by redirect() unreliably fails to redirect in
// this Next.js version when the token comes from cookies() (verified by
// isolation testing). The redirect below only fires if middleware's matcher
// somehow didn't cover this route.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const raw = headerList.get("x-lp-user");
  const user: SessionUser | null = raw ? JSON.parse(raw) : null;

  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar user={user} />
        <main id="main-content" className="flex-1 bg-surface-2 p-4 lg:p-8">
          {children}
        </main>
      </div>
      <LiveLeadToaster />
    </div>
  );
}
