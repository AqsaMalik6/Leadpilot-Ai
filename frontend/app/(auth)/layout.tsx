import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="container-lp flex h-18 items-center">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink-950">
          LeadPilot <span className="text-signal-500">AI</span>
        </Link>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  );
}
