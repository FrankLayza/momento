// Implements FR-1.1, FR-1.2
'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { flagUrl } from '@/lib/teamFlags'
import { copy } from '@/lib/copy'
import { CheckinButton } from '@/components/CheckinButton'
import type { NormalisedMatch, NormalisedOddsTick } from '@/server/txline/types'

interface LiveTicketCardProps {
  match: NormalisedMatch
  odds: NormalisedOddsTick
  initialCheckedIn: boolean
  competition?: string
}

const BARCODE_PATTERN = [1.5, 2, 2.5, 3, 1.5, 2.5, 2, 3, 1.5, 3, 2, 2.5, 1.5, 3]

export function LiveTicketCard({
  match,
  odds,
  initialCheckedIn,
  competition = 'FIFA World Cup 2026',
}: LiveTicketCardProps) {
  // Normalize probabilities to percentages
  const pHomePct = Math.round(odds.pHome * 100)
  const pAwayPct = Math.round(odds.pAway * 100)
  const pDrawPct = 100 - pHomePct - pAwayPct // ensure sum to exactly 100%
  const router = useRouter()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
      onClick={() => router.push(`/match/${match.id}`)}
      className="rounded-2xl overflow-hidden border border-cream-border shadow-sm flex bg-cream-surface cursor-pointer hover:border-ink/20 transition-colors"
    >
      {/* Left Panel */}
      <div className="flex-1 p-7 flex flex-col justify-between">
        <div>
          {/* Eyebrow */}
          <div className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-5">
            {competition}
          </div>

          {/* Teams row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <img
                src={flagUrl(match.home, 40)}
                alt={match.home}
                className="w-7 h-5 rounded-sm object-cover border border-cream-border/30"
              />
              <span className="font-display text-xl font-bold text-ink">{match.home}</span>
            </div>
            <span className="text-sm text-ink-ghost">vs</span>
            <div className="flex items-center gap-2">
              <img
                src={flagUrl(match.away, 40)}
                alt={match.away}
                className="w-7 h-5 rounded-sm object-cover border border-cream-border/30"
              />
              <span className="font-display text-xl font-bold text-ink">{match.away}</span>
            </div>
          </div>

          {/* Score display */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-[64px] font-bold leading-none tracking-tight text-cyan">
              {match.score.home}
            </span>
            <span className="font-display text-[48px] font-bold text-ink-ghost leading-none select-none">
              –
            </span>
            <span className="font-display text-[64px] font-bold leading-none tracking-tight text-live">
              {match.score.away}
            </span>
          </div>

          {/* Minute + status */}
          <div className="text-xs text-ink-secondary font-medium">
            {match.minute}&apos; · {copy.fixtures.liveNow}
          </div>
        </div>

        {/* Probability bar */}
        <div className="mt-6">
          <div className="flex justify-between text-[11px] font-semibold text-ink-ghost mb-1.5 uppercase tracking-wider">
            <span>{match.home} {pHomePct}%</span>
            <span>Draw {pDrawPct}%</span>
            <span>{match.away} {pAwayPct}%</span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden flex bg-cream-muted/30">
            <div className="bg-cyan h-full transition-all duration-500" style={{ width: `${pHomePct}%` }} />
            <div className="bg-cream-muted h-full transition-all duration-500" style={{ width: `${pDrawPct}%` }} />
            <div className="bg-live h-full transition-all duration-500" style={{ width: `${pAwayPct}%` }} />
          </div>
        </div>
      </div>

      {/* Right Stub Divider */}
      <div className="w-36 shrink-0 bg-cream border-l-2 border-dashed border-cream-muted p-5 flex flex-col justify-between">
        {/* Match number info */}
        <div>
          <div className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase">
            {copy.checkin.matchNo}
          </div>
          <div className="flex items-baseline font-display text-3xl font-bold text-ink leading-none mt-1">
            <span>{match.minute}</span>
            <span className="text-base text-ink-ghost font-normal">&apos;</span>
          </div>
          <div className="text-[10px] text-ink-ghost mt-0.5">
            {copy.checkin.minuteCaption}
          </div>
        </div>

        {/* Decorative barcode + CTA */}
        <div>
          <div className="text-[11px] text-ink-ghost font-medium mb-2 uppercase tracking-wider">
            {copy.fixtures.live}
          </div>
          {/* Barcode line */}
          <div className="flex gap-[1.5px] items-end mb-3">
            {BARCODE_PATTERN.map((w, idx) => (
              <span
                key={idx}
                className="bg-ink opacity-20 h-6 rounded-[1px]"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
          {/* Check-in Button */}
          <CheckinButton matchId={match.id} initialCheckedIn={initialCheckedIn} />
        </div>
      </div>
    </motion.div>
  )
}
