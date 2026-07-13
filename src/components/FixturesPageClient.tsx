// Implements FR-1.1, FR-1.2, FR-1.3
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { LiveTicketCard } from '@/components/LiveTicketCard'
import { UpcomingMatchRow } from '@/components/UpcomingMatchRow'
import { copy } from '@/lib/copy'
import type { NormalisedMatch, NormalisedOddsTick } from '@/server/txline/types'

interface FixturesPageClientProps {
  initialLiveMatch: NormalisedMatch | null
  initialLiveOdds: NormalisedOddsTick | null
  upcomingMatches: NormalisedMatch[]
  initialCheckedIn: boolean
  displayName: string
  userId: string | null
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const rowVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
}

export function FixturesPageClient({
  initialLiveMatch,
  initialLiveOdds,
  upcomingMatches,
  initialCheckedIn,
  displayName,
  userId,
}: FixturesPageClientProps) {
  const router = useRouter()

  // Keep the live card (score, minute, probability bar) current while a match
  // is in progress — the server component only re-fetches on navigation or
  // router.refresh(), so without this the card freezes at page-load values.
  useEffect(() => {
    if (!initialLiveMatch) return

    const interval = setInterval(() => {
      router.refresh()
    }, 12_000)

    return () => clearInterval(interval)
  }, [initialLiveMatch, router])

  return (
    <div className="bg-cream min-h-screen font-body text-ink">
      <Navbar displayName={displayName} userId={userId} />
      <main className="max-w-3xl mx-auto px-8 py-10">
        {/* Page header */}
        <p className="text-[11px] font-medium tracking-[0.12em] text-ink-ghost uppercase mb-2">
          {copy.fixtures.fifaWorldCup2026}
        </p>
        <h1 className="font-display text-[48px] font-bold text-ink leading-[1.05] mb-2">
          {copy.fixtures.fixturesTitle}
        </h1>
        <p className="text-sm text-ink-secondary mb-10">
          {copy.fixtures.fixturesSubtitle}
        </p>

        {/* Live section */}
        {initialLiveMatch && initialLiveOdds && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-[7px] h-[7px] rounded-full bg-live animate-pulse" />
              <span className="text-[11px] font-medium tracking-[0.12em] text-ink-secondary uppercase">
                {copy.fixtures.liveNow}
              </span>
            </div>
            <LiveTicketCard
              match={initialLiveMatch}
              odds={initialLiveOdds}
              initialCheckedIn={initialCheckedIn}
              competition="FIFA World Cup 2026"
            />
            {/* Divider */}
            <div className="h-px bg-cream-border my-8" />
          </>
        )}

        {/* Upcoming section */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-medium tracking-[0.12em] text-ink-secondary uppercase">
            {copy.fixtures.upcoming}
          </span>
        </div>
        <div className="bg-cream-surface rounded-2xl border border-cream-border overflow-hidden">
          {upcomingMatches.length > 0 ? (
            <motion.div variants={container} initial="hidden" animate="show">
              {upcomingMatches.map((match, i) => (
                <motion.div key={match.id} variants={rowVariant}>
                  <UpcomingMatchRow
                    match={match}
                    isLast={i === upcomingMatches.length - 1}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <p className="text-xs text-ink-ghost">
                {copy.fixtures.noFixtures}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
