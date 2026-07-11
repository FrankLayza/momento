import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Design Tokens (Implementation Guide §12) ──────────────────────────
      colors: {
        // Dark-theme base
        surface: {
          DEFAULT: "#121212",
          raised: "#13171F",
          overlay: "#1A1F2A",
          border: "#252B38",
        },
        // Tier accents (PRD FR-4.2)
        tier: {
          common: {
            DEFAULT: "#9BA3AF",  // neutral silver
            muted:   "#4B5563",
          },
          notable: {
            DEFAULT: "#22D3EE",  // cyan-400
            muted:   "#0E7490",
          },
          shock: {
            DEFAULT: "#F59E0B",  // amber-400
            muted:   "#92400E",
          },
          seismic: {
            DEFAULT: "#EF4444",  // crimson start of gradient
            end:     "#F59E0B",  // gold end (gradient allowed per spec)
            muted:   "#7F1D1D",
          },
        },
        // Text
        ink: {
          primary:   "#F3F4F6",
          secondary: "#9CA3AF",
          muted:     "#4B5563",
        },
        // Logged-out landing page only — a separate light theme, namespaced
        // so it can never collide with the app's own `surface`/`ink`/`tier`
        // tokens (the landing's own "ink" is a color, not that object).
        landing: {
          cream:    "#F5F4ED",
          ink:      "#100F06",
          gold:     "#FFDA57",
          coral:    "#F47575",
          malibu:   "#7DCAF6",
          teal:     "#00917A",
          lavender: "#A293FF",
          pink:     "#FFBBF4",
        },
      },

      // ── Landing-only radii ────────────────────────────────────────────────
      borderRadius: {
        landing: "20px",
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        // Header/display face — Sora (free substitute for Spotify's
        // proprietary "CircularSp-Deva"; see layout.tsx)
        display: ["var(--font-sora)", ...fontFamily.sans],
        // Body text
        body: ["var(--font-inter)", ...fontFamily.sans],
        sans: ["var(--font-inter)", ...fontFamily.sans],
        // Logged-out landing page only (loaded + scoped in Landing.tsx,
        // never applied at the html/body level)
        "landing-display": ["var(--font-unbounded)", ...fontFamily.sans],
        "landing-body": ["var(--font-landing-body)", ...fontFamily.sans],
      },

      // ── Card aspect ratio (2.5:3.5 trading-card ratio) ───────────────────
      aspectRatio: {
        card: "2.5 / 3.5",
      },

      // ── Background gradients ──────────────────────────────────────────────
      backgroundImage: {
        "seismic-gradient":
          "linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)",
        "foil-sheen":
          "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
      },

      // ── Animations ────────────────────────────────────────────────────────
      keyframes: {
        "probability-slide": {
          "0%":   { width: "0%" },
          "100%": { width: "var(--target-width)" },
        },
        "foil-sweep": {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "toast-in": {
          "0%":   { opacity: "0", transform: "translateY(1rem)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "probability-slide": "probability-slide 0.6s ease-out forwards",
        "foil-sweep":        "foil-sweep 3s ease-in-out infinite",
        "toast-in":          "toast-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
