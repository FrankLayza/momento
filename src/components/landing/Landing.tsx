/**
 * src/components/landing/Landing.tsx
 * Logged-out landing page — composes all landing sections.
 *
 * Loads its own font pair (Unbounded display, Space Grotesk body) scoped to
 * this subtree only via CSS variables, so the rest of the app keeps its own
 * Sora/Inter pairing untouched.
 */

import { Unbounded, Space_Grotesk } from "next/font/google";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-unbounded",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-landing-body",
  display: "swap",
});

export function Landing() {
  return (
    <div className={`${unbounded.variable} ${spaceGrotesk.variable}`}>
      <Hero />
      <HowItWorks />
      {/*
        Still to build once the rest of the spec arrives:
        - RevealPanel (needs the pinned-scroll mechanism + hero image asset)
        - RarityLadder
        - LiveNow
        - SiteFooter
      */}
    </div>
  );
}
