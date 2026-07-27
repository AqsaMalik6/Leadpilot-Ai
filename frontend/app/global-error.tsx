"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0B0F0E" }}>Something went wrong</h1>
          <p style={{ color: "#64748B", maxWidth: 380 }}>
            LeadPilot AI hit an unexpected error. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#22C55E",
              color: "#0B0F0E",
              border: "none",
              borderRadius: 999,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
