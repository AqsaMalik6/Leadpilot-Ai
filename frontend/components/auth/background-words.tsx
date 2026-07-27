const BG_ROWS = [
  ["Instant replies", "Qualified leads", "AI SDR", "Booked meetings", "24/7 coverage"],
  ["WhatsApp", "Email", "Website forms", "Calendly", "Slack alerts"],
  ["Never miss a lead", "Reply in seconds", "Qualify automatically", "Book the call"],
  ["HubSpot sync", "Lead scoring", "Real-time dashboard", "Team notifications"],
  ["No code required", "Setup in minutes", "Your AI sales rep", "Always on"],
  ["Higher conversion", "Faster response time", "Zero missed leads", "Smart handoff"],
  ["Track every conversation", "Live transcripts", "Automated qualification", "Human-like replies"],
  ["Grow your pipeline", "Close more deals", "Save hours weekly", "Scale without hiring"],
  ["Secure by design", "Multi-channel intake", "Custom qualifying questions", "Instant Calendly links"],
  ["Built for sales teams", "Powered by Groq", "Real conversations", "Real results"],
];

export function BackgroundWords() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 flex select-none flex-col justify-center gap-5 overflow-hidden"
    >
      {BG_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`flex w-max gap-10 whitespace-nowrap ${
            rowIndex % 2 === 0 ? "animate-marquee" : "animate-marquee-reverse"
          }`}
        >
          {[...row, ...row, ...row].map((word, i) => (
            <span key={i} className="font-display text-xl font-extrabold uppercase tracking-tight text-ink-950/[0.06]">
              {word}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
