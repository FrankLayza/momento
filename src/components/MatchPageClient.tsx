'use client'
import { useState } from 'react'
import { flagUrl } from '@/lib/teamFlags'
import { useCheckIn } from '@/hooks/useCheckIn'
import { MatchTimeline } from '@/components/MatchTimeline'
import { MatchLineups } from '@/components/MatchLineups'
import type { NormalisedMatch, NormalisedOddsTick } from '@/server/txline/types'

type Tab = 'timeline' | 'lineups'

interface Props {
  match: NormalisedMatch
  odds?: NormalisedOddsTick
  initialCheckedIn: boolean
  userId: string | null
}

export function MatchPageClient({ match, odds, initialCheckedIn, userId }: Props) {
  const [tab, setTab] = useState<Tab>('timeline')
  const { isCheckedIn, loading, checkIn } = useCheckIn(match.id, initialCheckedIn)

  const pHome = odds ? Math.round(odds.pHome * 100) : 33
  const pDraw = odds ? Math.round(odds.pDraw * 100) : 34
  const pAway = odds ? Math.round(odds.pAway * 100) : 33

  return (
    <div className="bg-cream min-h-screen font-body">
      <div className="max-w-3xl mx-auto px-8 py-8">

        {/* Match header */}
        <div className="bg-cream-surface rounded-2xl border border-cream-border p-6 mb-6">
          <p className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-4">
            {match.competition ?? 'FIFA World Cup 2026'} · {match.status === 'live' ? 'Live' : 'Finished'}
          </p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col items-center gap-2">
              <img src={flagUrl(match.home, 80)} alt={match.home} className="w-10 h-7 rounded object-cover" />
              <span className="font-display text-[15px] font-bold text-ink">{match.home}</span>
            </div>
            <div className="text-center">
              <div className="font-display text-[52px] font-bold leading-none tracking-tight text-ink">
                <span className="text-cyan">{match.score.home}</span>
                <span className="text-ink-ghost mx-2">–</span>
                <span className="text-live">{match.score.away}</span>
              </div>
              <p className="text-[12px] text-ink-secondary mt-1">
                {match.minute ? `${match.minute}' · Second half` : 'Full time'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={flagUrl(match.away, 80)} alt={match.away} className="w-10 h-7 rounded object-cover" />
              <span className="font-display text-[15px] font-bold text-ink">{match.away}</span>
            </div>
          </div>

          {/* Probability bar */}
          {odds && (
            <div>
              <div className="flex justify-between text-[11px] text-ink-ghost mb-1.5">
                <span>{match.home} {pHome}%</span>
                <span>Draw {pDraw}%</span>
                <span>{match.away} {pAway}%</span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden flex bg-cream-muted">
                <div className="h-full bg-cyan" style={{ width: `${pHome}%` }} />
                <div className="h-full bg-cream-muted" style={{ width: `${pDraw}%` }} />
                <div className="h-full bg-live" style={{ width: `${pAway}%` }} />
              </div>
            </div>
          )}

          {/* Check in button */}
          {match.status === 'live' && (
            <button
              onClick={checkIn}
              disabled={isCheckedIn || loading}
              className={`mt-4 w-full rounded-xl py-3 font-display text-[13px] font-bold tracking-wide transition-colors ${
                isCheckedIn
                  ? 'bg-ink/20 text-ink-secondary cursor-default'
                  : 'bg-ink text-cream hover:bg-ink/90'
              }`}
            >
              {isCheckedIn ? 'Checked In ✓' : loading ? 'Checking in…' : 'Check In →'}
            </button>
          )}

          {/* Tabs */}
          <div className="flex border-b border-cream-border mt-5">
            {(['timeline', 'lineups'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-[13px] font-medium capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'text-ink border-ink'
                    : 'text-ink-ghost border-transparent hover:text-ink-secondary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === 'timeline' && <MatchTimeline matchId={match.id} />}
        {tab === 'lineups' && <MatchLineups matchId={match.id} home={match.home} away={match.away} />}
      </div>
    </div>
  )
}