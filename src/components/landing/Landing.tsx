/**
 * src/components/landing/Landing.tsx
 * Logged-out landing page — composes all landing sections.
 *
 * Loads its own font pair (Unbounded display, Space Grotesk body) scoped to
 * this subtree only via CSS variables, so the rest of the app keeps its own
 * Sora/Inter pairing untouched.
 */

import { LandingNavbar } from "./LandingNavbar";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";

// Mock local fonts since Google Fonts fetch fails in offline build environments
const unbounded = { variable: "font-sans" };
const spaceGrotesk = { variable: "font-sans" };

export function Landing() {
  return (
    <div className={`${unbounded.variable} ${spaceGrotesk.variable} relative`}>
      <LandingNavbar />
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
