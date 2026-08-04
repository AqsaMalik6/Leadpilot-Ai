"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Bot,
  Plug,
  Bell,
  UsersRound,
  CreditCard,
  Settings,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/dashboard/leads", icon: Users },
  { label: "Outbound Leads", href: "/dashboard/outbound-leads", icon: Bot },
  { label: "Schedule", href: "/dashboard/schedule", icon: CalendarClock },
  { label: "Agent", href: "/dashboard/agent", icon: Bot },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Team", href: "/dashboard/team", icon: UsersRound },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-signal-500/10 text-signal-600" : "text-slate-500 hover:bg-surface-2 hover:text-ink-950",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
      <div className="flex h-18 items-center border-b border-line px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink-950">
          LeadPilot <span className="text-signal-500">AI</span>
        </Link>
      </div>
      <div className="p-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
