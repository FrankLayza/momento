/**
 * src/app/welcome/page.tsx
 * Marketing landing page — Hero, HowItWorks, etc.
 * Fully public, no session check. Its own CTA links to `/` (fixtures).
 */

import type { Metadata } from "next"
import { Landing } from "@/components/landing/Landing"

export const metadata: Metadata = {
  title: "Momento — You were watching. Now you can prove it.",
}

export default function WelcomePage() {
  return <Landing />
}
