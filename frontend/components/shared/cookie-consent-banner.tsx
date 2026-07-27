"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { setAnalyticsConsent } from "@/lib/analytics";

const CONSENT_KEY = "lp_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (!stored) setVisible(true);
    else if (stored === "granted") setAnalyticsConsent(true);
  }, []);

  function respond(granted: boolean) {
    window.localStorage.setItem(CONSENT_KEY, granted ? "granted" : "denied");
    setAnalyticsConsent(granted);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 backdrop-blur">
      <div className="container-lp flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          We use cookies for basic product analytics (never for ads).{" "}
          <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-ink-950">
            Read our privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => respond(false)}>
            Decline
          </Button>
          <Button size="sm" onClick={() => respond(true)}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
