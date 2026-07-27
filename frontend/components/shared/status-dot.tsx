import { cn } from "@/lib/utils";

export function StatusDot({
  live = true,
  className,
  label = "AI is replying now",
}: {
  live?: boolean;
  className?: string;
  label?: string;
}) {
  if (!live) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-signal-500" />
      </span>
      <span className="text-xs font-medium text-signal-600">{label}</span>
    </span>
  );
}
