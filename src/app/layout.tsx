/**
 * src/app/layout.tsx
 * Root layout for Momento.
 * Dark theme, Inter + Space Grotesk fonts.
 */

import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
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
      className={`${inter.variable} ${spaceGrotesk.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-surface text-ink-primary font-body antialiased">
        {children}
      </body>
    </html>
  );
}
