"use client";

/**
 * src/components/landing/Hero.tsx
 * Full-viewport hero for the logged-out landing page.
 *
 * Background image is exposed as a single constant so the real asset can
 * be dropped in later without touching layout code.
 */

import Image from "next/image";
import Link from "next/link";
import { copy } from "@/lib/copy";


const HERO_IMAGE_SRC = "/landing/landing.png";

export function Hero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-landing-ink">
      {/* Background image + scrim */}
      <Image
        src={HERO_IMAGE_SRC}
        alt=""
        fill
        priority
        className="object-cover"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
      <div className="absolute inset-0 bg-landing-ink/25" aria-hidden="true" />

      {/* Floating glass pill nav */}
      <div className="absolute top-8 left-0 right-0 z-10 flex items-center justify-between px-6 sm:px-10">
        <span className="font-landing-display text-lg font-bold text-white">
          Momento
        </span>

        <nav className="hidden sm:flex items-center gap-8 rounded-full border border-white/15 bg-white/10 px-8 py-3 backdrop-blur-md">
          <Link href="#how-it-works" className="font-landing-body text-sm text-white/90 hover:text-white transition-colors">
            {copy.landing.navHowItWorks}
          </Link>
          <Link href="#faq" className="font-landing-body text-sm text-white/90 hover:text-white transition-colors">
            {copy.landing.navFaq}
          </Link>
        </nav>

        <Link href="/?signin=1" className="font-landing-body text-sm text-white/90 hover:text-white transition-colors">
          {copy.landing.navSignIn}
        </Link>
      </div>

      {/* Headline */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h1 className="font-landing-display text-5xl sm:text-7xl font-bold leading-[1.05] tracking-tight text-white">
          {copy.landing.heroLine1}
          <br />
          {copy.landing.heroLine2}
        </h1>
        <p className="font-landing-body mt-6 text-base sm:text-lg text-white/85 max-w-xl mx-auto leading-relaxed">
          {copy.landing.heroSubcopy}
        </p>
        <Link
          href="/?signin=1"
          className="font-landing-body mt-8 inline-block rounded-full bg-landing-gold px-8 py-4 text-sm font-bold text-landing-ink hover:brightness-95 transition-all"
        >
          {copy.landing.heroCta}
        </Link>
      </div>
    </section>
  );
}
