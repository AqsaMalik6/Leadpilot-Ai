import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Tinted-background + solid-color-text pattern only — never a solid saturated
// background with white text (SKILL-FRONTEND.md §2.2 contrast rule).
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        neutral: "bg-surface-2 text-slate-500 ring-line",
        new: "bg-amber-500/10 text-amber-700 ring-amber-500/30",
        qualified: "bg-signal-500/10 text-signal-600 ring-signal-500/30",
        booked: "bg-blue-500/10 text-blue-700 ring-blue-500/30",
        rejected: "bg-red-500/10 text-red-700 ring-red-500/30",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
