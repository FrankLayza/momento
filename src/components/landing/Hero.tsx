"use client";

/**
 * src/components/landing/Hero.tsx
 * Full-viewport hero for the logged-out landing page.
 *
 * Background image is exposed as a single constant so the real asset can
 * be dropped in later without touching layout code.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { copy } from "@/lib/copy";


const HERO_IMAGE_SRC = "/landing/landing.png";

export function Hero() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="sticky top-0 h-screen w-full z-0 flex flex-col items-center justify-center overflow-hidden bg-landing-ink">
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
      <div className="fixed top-8 left-1/2 -translate-x-1/2 w-full max-w-5xl z-50 flex items-center justify-between px-6 sm:px-10 transition-all duration-300">
        <span className={`font-landing-display text-lg font-bold transition-colors duration-300 ${isScrolled ? "text-landing-ink" : "text-white"}`}>
          Momento
        </span>

        <nav className={`hidden sm:flex items-center gap-1.5 rounded-full border p-1.5 backdrop-blur-md transition-all duration-300 ${
          isScrolled
            ? "border-landing-ink/10 bg-white/60"
            : "border-white/15 bg-white/10"
        }`}>
          <Link
            href="#how-it-works"
            className={`font-landing-body text-sm px-5 py-2.5 rounded-full transition-all duration-200 ${
              isScrolled
                ? "text-landing-ink/90 hover:bg-landing-ink hover:text-cream"
                : "text-white/90 hover:bg-cream hover:text-landing-ink"
            }`}
          >
            {copy.landing.navHowItWorks}
          </Link>
          <Link
            href="#faq"
            className={`font-landing-body text-sm px-5 py-2.5 rounded-full transition-all duration-200 ${
              isScrolled
                ? "text-landing-ink/90 hover:bg-landing-ink hover:text-cream"
                : "text-white/90 hover:bg-cream hover:text-landing-ink"
            }`}
          >
            {copy.landing.navFaq}
          </Link>
        </nav>

        <Link
          href="/?signin=1"
          className={`font-landing-body text-sm transition-colors duration-300 ${
            isScrolled
              ? "text-landing-ink/90 hover:text-landing-ink"
              : "text-white/90 hover:text-white"
          }`}
        >
          {copy.landing.navSignIn}
        </Link>
      </div>

      {/* Headline */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center mt-20">
        <h1 className="font-landing-display text-5xl sm:text-7xl leading-[1.05] tracking-tight text-white">
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
