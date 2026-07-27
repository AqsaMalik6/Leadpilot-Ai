import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CompassIcon } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-slate-500">
        <CompassIcon className="h-7 w-7" />
      </span>
      <h1 className="font-display text-3xl font-bold text-ink-950">Page not found</h1>
      <p className="max-w-sm text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
