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
    <section className="sticky top-0 h-screen w-full z-0 flex flex-col items-center justify-start pt-[180px] sm:pt-[220px] overflow-hidden bg-landing-ink">
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

      {/* Headline */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <h1 className="font-landing-display text-5xl sm:text-7xl leading-[1.05] tracking-tight text-white">
          {copy.landing.heroLine1}
          <br />
          {copy.landing.heroLine2}
        </h1>
        <p className="font-landing-body mt-4 text-base sm:text-lg text-white/85 max-w-xl mx-auto leading-relaxed">
          {copy.landing.heroSubcopy}
        </p>
        <Link
          href="/"
          className="font-landing-body mt-4 inline-block rounded-full bg-landing-gold px-8 py-4 text-sm font-bold text-landing-ink hover:brightness-95 transition-all"
        >
          {copy.landing.heroCta}
        </Link>
      </div>
    </section>
  );
}
