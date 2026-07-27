"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-600" />
      <h2 className="font-display text-lg font-bold text-ink-950">Something went wrong loading this page</h2>
      <p className="max-w-md text-sm text-slate-500">{error.message || "An unexpected error occurred."}</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
