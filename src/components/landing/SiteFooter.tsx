'use client'

import Link from 'next/link'
import { copy } from '@/lib/copy'

export function SiteFooter() {
  return (
    <footer className="bg-landing-ink text-landing-cream relative overflow-hidden z-20 pt-20 pb-10">
      {/* Subtle top border gradient using landing accents */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-landing-gold via-landing-coral to-landing-malibu" />

      {/* Background ambient glow */}
      <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-landing-teal/5 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-[400px] h-[400px] rounded-full bg-landing-lavender/5 blur-[100px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-8 sm:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 pb-16 border-b border-landing-cream/10">
          
          {/* Brand block */}
          <div className="md:col-span-5 flex flex-col items-start gap-4">
            <span className="font-landing-display text-2xl font-bold tracking-tight text-white">
              Momento
            </span>
            <p className="font-landing-body text-sm text-landing-cream/70 max-w-sm leading-relaxed">
              {copy.tagline}
            </p>
            <div className="inline-block mt-2 border border-landing-gold/20 text-landing-gold text-[9px] font-landing-display font-medium tracking-[0.18em] py-1.5 px-3 rounded-full uppercase bg-landing-gold/5">
              {copy.fixtures.fifaWorldCup2026} Edition
            </div>
          </div>

          {/* Links block */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Column 1: Navigation */}
            <div className="flex flex-col gap-4">
              <h4 className="font-landing-display text-[11px] font-bold tracking-[0.14em] text-white uppercase opacity-40">
                Navigation
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link href="#how-it-works" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    {copy.landing.navHowItWorks}
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    {copy.landing.navFaq}
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    {copy.landing.navSignIn}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 2: Connect */}
            <div className="flex flex-col gap-4">
              <h4 className="font-landing-display text-[11px] font-bold tracking-[0.14em] text-white uppercase opacity-40">
                Connect
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <a href="https://twitter.com" target="_blank" rel="noreferrer" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a href="https://discord.gg" target="_blank" rel="noreferrer" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    Instagram
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal */}
            <div className="flex flex-col gap-4 col-span-2 sm:col-span-1">
              <h4 className="font-landing-display text-[11px] font-bold tracking-[0.14em] text-white uppercase opacity-40">
                Legal
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link href="/terms" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="font-landing-body text-sm text-landing-cream/70 hover:text-white hover:underline transition-colors duration-200">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom footer bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs font-landing-body text-landing-cream/40">
          <p>© {new Date().getFullYear()} {copy.appName}. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-landing-teal animate-pulse" />
            Verified & permanent on-chain moments.
          </p>
        </div>
      </div>

      {/* Giant ambient wordmark in background */}
      <div className="absolute bottom-[-10px] sm:bottom-[-20px] left-0 right-0 text-center select-none pointer-events-none z-0">
        <span className="font-landing-display text-[64px] sm:text-[120px] font-black uppercase text-white/[0.02] tracking-[0.15em] leading-none">
          Momento
        </span>
      </div>
    </footer>
  )
}
