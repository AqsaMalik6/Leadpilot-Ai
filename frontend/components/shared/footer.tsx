import Link from "next/link";
import { Twitter, Linkedin, Github } from "lucide-react";
import { NewsletterForm } from "@/components/shared/newsletter-form";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Overview", href: "/product" },
      { label: "Qualification logic", href: "/product/qualification" },
      { label: "Integrations", href: "/product/integrations" },
      { label: "Live demo", href: "/demo" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Real estate", href: "/solutions/real-estate" },
      { label: "Home services", href: "/solutions/home-services" },
      { label: "B2B SaaS", href: "/solutions/b2b-saas" },
      { label: "Marketing agencies", href: "/solutions/marketing-agencies" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Customers", href: "/customers" },
      { label: "FAQ", href: "/faq" },
      { label: "Compare: vs Lindy AI", href: "/compare/lindy" },
      { label: "Compare: vs Artisan", href: "/compare/artisan" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Security", href: "/security" },
      { label: "Contact", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of service", href: "/legal/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-950 text-white">
      <div className="container-lp py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="font-display text-lg font-bold tracking-tight">
              LeadPilot <span className="text-signal-500">AI</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-white/60">
              Your AI SDR replies to every lead in under 10 seconds — qualifies them, books the
              call, never sleeps.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="LeadPilot AI on Twitter" className="text-white/60 hover:text-white">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" aria-label="LeadPilot AI on LinkedIn" className="text-white/60 hover:text-white">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" aria-label="LeadPilot AI on GitHub" className="text-white/60 hover:text-white">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-white">{col.title}</h3>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-white/60 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <NewsletterForm />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} LeadPilot AI. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/sitemap.xml" className="hover:text-white/70">
              sitemap.xml
            </Link>
            <Link href="/llms.txt" className="hover:text-white/70">
              llms.txt
            </Link>
            <Link href="/robots.txt" className="hover:text-white/70">
              robots.txt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
