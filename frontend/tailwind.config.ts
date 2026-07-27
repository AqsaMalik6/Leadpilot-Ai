import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      maxWidth: {
        container: "1280px",
        "container-lg": "1440px",
      },
      colors: {
        ink: {
          950: "#0B0F0E",
          900: "#12181A",
          700: "#1E2A2D",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          2: "#F5F7F5",
        },
        signal: {
          500: "#22C55E",
          600: "#16A34A",
        },
        amber: {
          500: "#F59E0B",
          700: "#B45309",
        },
        blue: {
          500: "#3B82F6",
          700: "#1D4ED8",
        },
        red: {
          500: "#EF4444",
          700: "#B91C1C",
        },
        slate: {
          500: "#64748B",
        },
        line: "#E5E7EB",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "#22C55E",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#22C55E",
          foreground: "#0B0F0E",
        },
        secondary: {
          DEFAULT: "#12181A",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F7F5",
          foreground: "#64748B",
        },
        accent: {
          DEFAULT: "#F5F7F5",
          foreground: "#0B0F0E",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#0B0F0E",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "12px",
        "2xl": "16px",
      },
      spacing: {
        "18": "4.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(34,197,94,0.45)" },
          "50%": { opacity: "0.7", boxShadow: "0 0 0 6px rgba(34,197,94,0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-slide-up": "fade-slide-up 0.5s ease-out both",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        marquee: "marquee 28s linear infinite",
        "marquee-reverse": "marquee-reverse 34s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
