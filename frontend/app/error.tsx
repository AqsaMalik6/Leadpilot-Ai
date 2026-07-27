"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-700">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h1 className="font-display text-3xl font-bold text-ink-950">Something went wrong</h1>
      <p className="max-w-sm text-slate-500">
        An unexpected error occurred while loading this page. You can try again, or head back home.
      </p>
      <Button onClick={reset} className="mt-2">
        Try again
      </Button>
    </main>
  );
}
