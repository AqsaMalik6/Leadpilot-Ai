"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const PRODUCT_LINKS = [
  { label: "Overview", href: "/product" },
  { label: "Qualification logic", href: "/product/qualification" },
  { label: "Integrations", href: "/product/integrations" },
];

const SOLUTIONS_LINKS = [
  { label: "Real estate", href: "/solutions/real-estate" },
  { label: "Home services", href: "/solutions/home-services" },
  { label: "B2B SaaS", href: "/solutions/b2b-saas" },
  { label: "Marketing agencies", href: "/solutions/marketing-agencies" },
];

const NAV_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Customers", href: "/customers" },
  { label: "Blog", href: "/blog" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isDarkHero = pathname === "/";

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !isDarkHero;
  const textColor = solid ? "text-ink-950" : "text-white";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        solid ? "bg-surface/95 shadow-sm backdrop-blur" : "bg-transparent",
      )}
    >
      <nav className="container-lp flex h-18 items-center justify-between">
        <Link href="/" className={cn("font-display text-lg font-bold tracking-tight", textColor)}>
          LeadPilot <span className="text-signal-500">AI</span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-black/5",
                  textColor,
                )}
              >
                Product <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PRODUCT_LINKS.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-black/5",
                  textColor,
                )}
              >
                Solutions <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {SOLUTIONS_LINKS.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link href={link.href}>{link.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors hover:bg-black/5",
                textColor,
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Button variant="ghost" size="sm" asChild className={solid ? "" : "text-white hover:bg-white/10"}>
            <Link href="/login">Login</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/demo">Get a demo lead</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              className={cn("rounded-full p-2 lg:hidden", textColor)}
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-4 flex flex-col gap-1">
              {[...PRODUCT_LINKS, ...SOLUTIONS_LINKS, ...NAV_LINKS].map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-surface-2"
                  >
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                <SheetClose asChild>
                  <Button variant="outline" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button asChild>
                    <Link href="/demo">Get a demo lead</Link>
                  </Button>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
