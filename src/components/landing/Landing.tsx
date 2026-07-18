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
import { SiteFooter } from "./SiteFooter";

import { Unbounded, Space_Grotesk } from "next/font/google";

const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-unbounded" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-landing-body" });

export function Landing() {
  return (
    <div className={`${unbounded.variable} ${spaceGrotesk.variable} relative`}>
      <LandingNavbar />
      <Hero />
      <HowItWorks />
      <SiteFooter />
    </div>
  );
}
