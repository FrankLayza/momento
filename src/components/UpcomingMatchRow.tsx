// Implements FR-1.1
'use client'

import Link from 'next/link'
import { flagUrl } from '@/lib/teamFlags'
import { copy } from '@/lib/copy'
import type { NormalisedMatch } from '@/server/txline/types'

interface UpcomingMatchRowProps {
  match: NormalisedMatch
  isLast?: boolean
}

export function UpcomingMatchRow({ match, isLast = false }: UpcomingMatchRowProps) {
  const dateObj = new Date(match.kickoffUtc)
  const timeStr = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateStr = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })

  return (
    <Link
      href={`/match/${match.id}`}
      className={`flex items-center px-6 py-4 transition-colors cursor-pointer hover:bg-cream-surface ${
        isLast ? '' : 'border-b border-cream-border'
      }`}
    >
      {/* Home team (left aligned) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img
          src={flagUrl(match.home, 20)}
          alt={match.home}
          className="w-5 h-3.5 rounded-sm object-cover border border-cream-border/30"
        />
        <span className="font-display text-[15px] font-bold text-ink truncate">
          {match.home}
        </span>
      </div>

      {/* Time block (centered) */}
      <div className="text-center w-24 shrink-0">
        <div className="font-display text-xl font-bold text-ink leading-none">
          {timeStr}
        </div>
        <div className="text-[11px] text-ink-ghost mt-1 font-medium tracking-wide">
          {dateStr}
        </div>
      </div>

      {/* Away team (right aligned, flag on the right) */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="font-display text-[15px] font-bold text-ink truncate">
          {match.away}
        </span>
        <img
          src={flagUrl(match.away, 20)}
          alt={match.away}
          className="w-5 h-3.5 rounded-sm object-cover border border-cream-border/30"
        />
      </div>

      {/* Status (right end) */}
      <div className="text-[11px] font-medium tracking-[0.08em] text-ink-ghost uppercase w-24 text-right pl-3 border-l border-cream-border/40 ml-3">
        {copy.fixtures.upcoming}
      </div>
    </Link>
  )
}
