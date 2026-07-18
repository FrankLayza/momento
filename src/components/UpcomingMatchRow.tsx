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
      className={`flex items-center px-4 sm:px-6 py-3.5 transition-colors cursor-pointer ${
        isLast ? '' : 'border-b'
      }`}
      style={{
        borderColor: 'var(--color-border-muted)',
        ['--tw-bg-opacity' as string]: '1',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Home */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img
          src={flagUrl(match.home, 20)}
          alt={match.home}
          className="w-5 h-3.5 rounded-sm object-cover shrink-0"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
        />
        <span className="font-display text-[15px] text-[var(--color-fore)] truncate tracking-wide">
          {match.home}
        </span>
      </div>

      {/* Time block */}
      <div className="text-center w-20 sm:w-24 shrink-0">
        <div className="font-display text-lg sm:text-xl text-[var(--color-fore)] leading-none">
          {timeStr}
        </div>
        <div className="text-[10px] text-[var(--color-fore-3)] mt-0.5 font-medium">
          {dateStr}
        </div>
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
        <span className="font-display text-[15px] text-[var(--color-fore)] truncate tracking-wide text-right">
          {match.away}
        </span>
        <img
          src={flagUrl(match.away, 20)}
          alt={match.away}
          className="w-5 h-3.5 rounded-sm object-cover shrink-0"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
        />
      </div>

      {/* Status pill */}
      <div className="ml-3 pl-3 shrink-0 hidden sm:block" style={{ borderLeft: '1px solid var(--color-border-muted)' }}>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--color-fore-3)] uppercase">
          {copy.fixtures.upcoming}
        </span>
      </div>
    </Link>
  )
}
