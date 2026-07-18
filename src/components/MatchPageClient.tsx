'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { flagUrl } from '@/lib/teamFlags'
import { useCheckIn } from '@/hooks/useCheckIn'
import { MatchTimeline } from '@/components/MatchTimeline'
import { MatchLineups } from '@/components/MatchLineups'
import { MatchStats } from '@/components/MatchStats'
import { Navbar } from '@/components/Navbar'
import { WitnessNotifications } from '@/components/WitnessNotifications'
import type { NormalisedMatch, NormalisedOddsTick } from '@/server/txline/types'
import { formatMatchMinute, getPeriodLabel } from '@/lib/matchUtils'

type Tab = 'timeline' | 'lineups' | 'stats'

interface Props {
  match: NormalisedMatch
  odds?: NormalisedOddsTick
  initialCheckedIn: boolean
  userId: string | null
  displayName: string
  isReplay?: boolean
}

export function MatchPageClient({ match, odds, initialCheckedIn, userId, displayName, isReplay = false }: Props) {
  const [tab, setTab] = useState<Tab>('timeline')
  const { isCheckedIn, loading, checkIn } = useCheckIn(match.id, initialCheckedIn)
  const router = useRouter()

  // The server component only re-fetches on navigation or router.refresh() —
  // without this the score/minute freeze at whatever they were on page load
  // (same staleness fix as FixturesPageClient's live ticket card).
  useEffect(() => {
    if (match.status !== 'live') return

    const interval = setInterval(() => {
      router.refresh()
    }, 12_000)

    return () => clearInterval(interval)
  }, [match.status, router])

  const pHome = odds ? Math.round(odds.pHome * 100) : 33
  const pDraw = odds ? Math.round(odds.pDraw * 100) : 34
  const pAway = odds ? Math.round(odds.pAway * 100) : 33

  return (
    <div className="min-h-screen font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      <Navbar displayName={displayName} userId={userId} />
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">

        {/* Match header */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-4" style={{ color: 'var(--color-fore-3)' }}>
            {match.competition ?? 'FIFA World Cup 2026'} · {match.status === 'live' ? 'Live' : match.status === 'finished' ? 'Finished' : 'Upcoming'}
            {isReplay && (
              <span className="ml-2 text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Replay
              </span>
            )}
          </p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col items-center gap-2">
              <img src={flagUrl(match.home, 80)} alt={match.home} className="w-10 h-7 rounded object-cover" />
              <span className="font-display text-[15px] font-bold" style={{ color: 'var(--color-fore)' }}>{match.home}</span>
            </div>
            <div className="text-center">
              <div className="font-display text-[52px] font-bold leading-none tracking-tight" style={{ color: 'var(--color-fore)' }}>
                <span className="text-cyan">{match.score.home}</span>
                <span className="mx-2" style={{ color: 'var(--color-fore-3)' }}>–</span>
                <span className="text-live">{match.score.away}</span>
              </div>
              <p className="text-[12px] mt-1" style={{ color: 'var(--color-fore-2)' }}>
                {match.status === 'finished'
                  ? 'Full time'
                  : match.minute
                    ? `${formatMatchMinute(match.minute, match.phase)}' · ${getPeriodLabel(match.minute, match.phase)}`
                    : 'Kick off soon'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={flagUrl(match.away, 80)} alt={match.away} className="w-10 h-7 rounded object-cover" />
              <span className="font-display text-[15px] font-bold" style={{ color: 'var(--color-fore)' }}>{match.away}</span>
            </div>
          </div>

          {/* Probability bar */}
          {odds && (
            <div>
              <div className="flex justify-between text-[11px] mb-1.5" style={{ color: 'var(--color-fore-3)' }}>
                <span>{match.home} {pHome}%</span>
                <span>Draw {pDraw}%</span>
                <span>{match.away} {pAway}%</span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden flex" style={{ background: 'var(--color-border-muted)' }}>
                <div className="h-full bg-cyan" style={{ width: `${pHome}%` }} />
                <div className="h-full" style={{ width: `${pDraw}%`, background: 'var(--color-border)' }} />
                <div className="h-full bg-live" style={{ width: `${pAway}%` }} />
              </div>
            </div>
          )}

          {/* Check in button — open before kick-off and while live (FR-2.1) */}
          {match.status !== 'finished' && (
            <button
              onClick={checkIn}
              disabled={isCheckedIn || loading}
              className={`mt-4 w-full rounded-xl py-3 font-display text-[13px] font-bold tracking-wide transition-colors flex items-center justify-center gap-1.5 ${
                isCheckedIn
                  ? 'bg-[var(--color-fore)]/20 text-[var(--color-fore-3)] cursor-default'
                  : 'bg-[var(--color-fore)] text-[var(--color-surface)] hover:bg-[var(--color-fore)]/90'
              }`}
            >
              {isCheckedIn ? (
                'Checked In ✓'
              ) : loading ? (
                <svg className="animate-spin h-4 w-4 text-[var(--color-surface)]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Check In →'
              )}
            </button>
          )}

          {/* Tabs */}
          <div className="flex border-b mt-5" style={{ borderColor: 'var(--color-border)' }}>
            {(['timeline', 'lineups', 'stats'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-[13px] font-semibold capitalize transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? 'border-[var(--color-fore)]'
                    : 'border-transparent'
                }`}
                style={{
                  color: tab === t ? 'var(--color-fore)' : 'var(--color-fore-3)'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === 'timeline' && <MatchTimeline matchId={match.id} status={match.status} home={match.home} away={match.away} />}
        {tab === 'lineups' && <MatchLineups matchId={match.id} home={match.home} away={match.away} />}
        {tab === 'stats' && <MatchStats matchId={match.id} status={match.status} home={match.home} away={match.away} currentMinute={match.minute} />}

        {/* Live Moment notifications */}
        <WitnessNotifications matchId={match.id} isWitness={isCheckedIn} />
      </div>
    </div>
  )
}