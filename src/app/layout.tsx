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
import { Inter, Sora } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { AuthHandler } from "@/components/AuthHandler";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

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
        <Navbar />
        <div className="flex-1 w-full">
          {children}
        </div>
        <AuthHandler />
      </body>
    </html>
  );
}
