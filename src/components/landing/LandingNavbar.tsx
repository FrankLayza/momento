'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { copy } from '@/lib/copy'

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Color transition triggers only when the How It Works section occupies the screen
      setIsScrolled(window.scrollY >= window.innerHeight * 0.9)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-[1400px] z-50 flex items-center justify-between px-8 sm:px-12 transition-all duration-300">
      {/* Brand logo */}
      <span
        className={`font-landing-display text-lg font-bold transition-colors duration-300 ${
          isScrolled ? 'text-landing-ink' : 'text-white'
        }`}
      >
        Momento
      </span>

      {/* Center pill nav */}
      <nav
        className={`hidden sm:flex items-center gap-4 rounded-full border p-1.5 backdrop-blur-md transition-all duration-300 ${
          isScrolled
            ? 'border-landing-ink/10 bg-white/60'
            : 'border-white/15 bg-white/10'
        }`}
      >
        <Link
          href="#how-it-works"
          className={`font-landing-body text-sm px-5 py-2.5 rounded-full transition-all duration-200 ${
            isScrolled
              ? 'text-landing-ink/90 hover:bg-landing-ink hover:text-cream'
              : 'text-white/90 hover:bg-cream hover:text-landing-ink'
          }`}
        >
          {copy.landing.navHowItWorks}
        </Link>
        <Link
          href="#faq"
          className={`font-landing-body text-sm px-5 py-2.5 rounded-full transition-all duration-200 ${
            isScrolled
              ? 'text-landing-ink/90 hover:bg-landing-ink hover:text-cream'
              : 'text-white/90 hover:bg-cream hover:text-landing-ink'
          }`}
        >
          {copy.landing.navFaq}
        </Link>
      </nav>

      {/* Sign in */}
      <Link
        href="/?signin=1"
        className={`font-landing-body text-sm transition-colors duration-300 ${
          isScrolled
            ? 'text-landing-ink/90 hover:text-landing-ink'
            : 'text-white/90 hover:text-white'
        }`}
      >
        {copy.landing.navSignIn}
      </Link>
    </div>
  )
}
