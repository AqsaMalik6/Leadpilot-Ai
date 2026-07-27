"use client";

// Gated behind CookieConsentBanner (SKILL-FRONTEND.md §3.8, §6) — no analytics
// script initializes before the visitor grants consent. PostHog/GA4 wiring is
// intentionally left as a placeholder call site until real keys exist.

let consentGranted = false;

export function setAnalyticsConsent(granted: boolean) {
  consentGranted = granted;
  if (granted) {
    // e.g. posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, { ... })
    trackEvent("consent_granted");
  }
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (!consentGranted) return;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", name, properties);
  }
}
