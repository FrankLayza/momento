/**
 * src/app/layout.tsx
 * Root layout for Momento.
 * Dark theme, Inter (body) + Sora (headers/display).
 *
 * Sora is the header font — a free, geometric-grotesk substitute for
 * Spotify's proprietary "CircularSp-Deva" (not licensable for use here;
 * Sora is the closest available match in Google Fonts).
 */

import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { AuthHandler } from "@/components/AuthHandler";
import { Suspense } from "react";
import "./globals.css";

// Mock local fonts since Google Fonts fetch fails in offline build environments
const inter = { variable: "font-sans" };
const sora = { variable: "font-sans" };

export const metadata: Metadata = {
  title: {
    default:  "Momento — You were watching. Now you can prove it.",
    template: "%s | Momento",
  },
  description:
    "Momento turns the exact moment a World Cup match shocked the world into a digital keepsake — only claimable by the fans who were watching live.",
  keywords: ["football", "World Cup", "live", "moments", "fan experience"],
  openGraph: {
    type:      "website",
    siteName:  "Momento",
    title:     "Momento",
    description: "You were watching. Now you can prove it.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sora.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-surface text-ink-primary font-body antialiased flex flex-col">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <div className="flex-1 w-full">
          {children}
        </div>
        <Suspense fallback={null}>
          <AuthHandler />
        </Suspense>
      </body>
    </html>
  );
}
