// Implements FR-1.1, FR-1.2, FR-1.3
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'
import { LiveTicketCard } from '@/components/LiveTicketCard'
import { UpcomingFallbackCard } from '@/components/UpcomingFallbackCard'
import { UpcomingMatchRow } from '@/components/UpcomingMatchRow'
import { FixturesEmptyState } from '@/components/FixturesEmptyState'
import { copy } from '@/lib/copy'
import type { NormalisedMatch, NormalisedOddsTick } from '@/server/txline/types'

interface FixturesPageClientProps {
  initialLiveMatch: NormalisedMatch | null
  initialLiveOdds: NormalisedOddsTick | null
  upcomingMatches: NormalisedMatch[]
  initialCheckedIn: boolean
  checkedInMatchIds?: string[]
  displayName: string
  userId: string | null
  isReplay?: boolean
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
  checkedInMatchIds = [],
  displayName,
  userId,
  isReplay = false,
}: FixturesPageClientProps) {
  const router = useRouter()

  const fallbackMatch = !initialLiveMatch ? upcomingMatches[0] ?? null : null
  const listedMatches = fallbackMatch
    ? upcomingMatches.filter(m => m.id !== fallbackMatch.id)
    : upcomingMatches

  useEffect(() => {
    if (!initialLiveMatch) return
    const interval = setInterval(() => { router.refresh() }, 12_000)
    return () => clearInterval(interval)
  }, [initialLiveMatch, router])

  return (
    <div className="min-h-screen font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      <Navbar displayName={displayName} userId={userId} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Page header */}
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--color-fore-3)' }}>
          {copy.fixtures.fifaWorldCup2026}
        </p>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-none mb-1" style={{ color: 'var(--color-fore)' }}>
          {copy.fixtures.fixturesTitle}
        </h1>
        <p className="text-sm mb-8 font-medium" style={{ color: 'var(--color-fore-2)' }}>
          {copy.fixtures.fixturesSubtitle}
        </p>

        {/* Live section */}
        {initialLiveMatch && initialLiveOdds && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="live-dot" />
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--color-accent)' }}>
                {copy.fixtures.liveNow}
              </span>
              {isReplay && (
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full" style={{ background: 'var(--color-amber)', color: '#fff' }}>
                  {copy.fixtures.replayBadge}
                </span>
              )}
            </div>
            <LiveTicketCard
              match={initialLiveMatch}
              odds={initialLiveOdds}
              initialCheckedIn={initialCheckedIn}
              competition={initialLiveMatch.competition ?? 'FIFA World Cup 2026'}
            />
            <div className="h-px my-8" style={{ background: 'var(--color-border)' }} />
          </>
        )}

        {/* Up next fallback */}
        {fallbackMatch && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--color-fore-3)' }}>
                {copy.fixtures.upNext}
              </span>
            </div>
            <UpcomingFallbackCard
              match={fallbackMatch}
              initialCheckedIn={checkedInMatchIds.includes(fallbackMatch.id)}
            />
            <div className="h-px my-8" style={{ background: 'var(--color-border)' }} />
          </>
        )}

        {/* Upcoming section */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--color-fore-3)' }}>
            {copy.fixtures.upcoming}
          </span>
        </div>

        {listedMatches.length > 0 ? (
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <motion.div variants={container} initial="hidden" animate="show">
              {listedMatches.map((match, i) => (
                <motion.div key={match.id} variants={rowVariant}>
                  <UpcomingMatchRow
                    match={match}
                    isLast={i === listedMatches.length - 1}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          <FixturesEmptyState />
        )}
      </main>
    </div>
  )
}
