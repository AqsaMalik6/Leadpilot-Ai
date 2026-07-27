import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { SkipToContent } from "@/components/shared/skip-to-content";
import { CookieConsentBanner } from "@/components/shared/cookie-consent-banner";
import { JsonLd } from "@/components/shared/json-ld";
import { organizationJsonLd, softwareApplicationJsonLd, siteConfig } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={softwareApplicationJsonLd()} />
        <SkipToContent />
        <QueryProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <CookieConsentBanner />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
