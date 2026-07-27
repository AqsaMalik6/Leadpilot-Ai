import { FadeIn } from "@/components/shared/fade-in";

const LOGOS = ["OpenAI", "Groq", "Slack", "HubSpot", "Calendly", "WhatsApp"];

export function TrustBar() {
  return (
    <section className="border-b border-line bg-surface-2 py-14">
      <div className="container-lp">
        <FadeIn>
          <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-500">
            Built on the same stack as the integrations you already use
          </p>
        </FadeIn>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-8">
          {LOGOS.map((logo, i) => (
            <FadeIn key={logo} delay={i * 0.06}>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -right-3 -top-3 h-10 w-10 rounded-full bg-signal-500/70 blur-xl"
                />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-ink-950 bg-surface sm:h-32 sm:w-32">
                  <span className="font-display text-sm font-semibold text-ink-950 sm:text-base">{logo}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
