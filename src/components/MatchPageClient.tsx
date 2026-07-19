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

  const bgColors = {
    live: '#0F3D2E',
    scheduled: '#1A1F6E',
    finished: '#1E293B',
  }
  const cardBg = bgColors[match.status] || '#1E293B'

  return (
    <div className="min-h-screen font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      <Navbar displayName={displayName} userId={userId} />
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">

        {/* Match header */}
        <div className="rounded-2xl p-6 mb-6 relative overflow-hidden shadow-lg border border-white/5" style={{ background: cardBg }}>
          {/* Large watermark team names behind content */}
          <div
            className="absolute inset-0 flex items-center justify-between px-4 select-none pointer-events-none overflow-hidden"
            aria-hidden="true"
          >
            <span
              className="font-display text-[clamp(48px,12vw,96px)] leading-none uppercase tracking-tight opacity-10 text-white"
              style={{ letterSpacing: '0.02em' }}
            >
              {match.home}
            </span>
            <span
              className="font-display text-[clamp(48px,12vw,96px)] leading-none uppercase tracking-tight opacity-10 text-white text-right"
              style={{ letterSpacing: '0.02em' }}
            >
              {match.away}
            </span>
          </div>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
              {match.competition ?? 'FIFA World Cup 2026'}
            </p>
            <div className="flex items-center gap-2">
              {match.status === 'live' && (
                <span className="flex items-center gap-1.5 bg-accent text-fore text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Live
                </span>
              )}
              {match.status === 'finished' && (
                <span className="text-[10px] font-bold tracking-widest uppercase bg-white/10 text-white/80 px-2.5 py-1 rounded-full border border-white/10">
                  Finished
                </span>
              )}
              {match.status === 'scheduled' && (
                <span className="text-[10px] font-bold tracking-widest uppercase bg-white/10 text-white/80 px-2.5 py-1 rounded-full border border-white/10">
                  Upcoming
                </span>
              )}
              {isReplay && (
                <span className="text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  Replay
                </span>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex flex-col items-center gap-2">
              <img src={flagUrl(match.home, 80)} alt={match.home} className="w-10 h-7 rounded object-cover shadow-md" />
              <span className="font-display text-[15px] font-bold text-white uppercase">{match.home}</span>
            </div>
            <div className="text-center">
              <div className="font-display text-[52px] font-bold leading-none tracking-tight">
                <span className="text-[#4DD98A]">{match.score.home}</span>
                <span className="mx-2 text-white/30">–</span>
                <span className="text-[#FF6B5B]">{match.score.away}</span>
              </div>
              <p className="text-[12px] mt-1 text-white/50 font-semibold">
                {match.status === 'finished'
                  ? 'Full time'
                  : match.minute
                    ? `${formatMatchMinute(match.minute, match.phase)}' · ${getPeriodLabel(match.minute, match.phase)}`
                    : 'Kick off soon'}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={flagUrl(match.away, 80)} alt={match.away} className="w-10 h-7 rounded object-cover shadow-md" />
              <span className="font-display text-[15px] font-bold text-white uppercase">{match.away}</span>
            </div>
          </div>

          {/* Probability bar */}
          {odds && (
            <div className="relative z-10 mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                <span>{match.home} {pHome}%</span>
                <span>Draw {pDraw}%</span>
                <span>{match.away} {pAway}%</span>
              </div>
              <div className="h-[4px] rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${pHome}%`, background: '#4DD98A' }} />
                <div className="h-full transition-all duration-500" style={{ width: `${pDraw}%`, background: 'rgba(255,255,255,0.2)' }} />
                <div className="h-full transition-all duration-500" style={{ width: `${pAway}%`, background: '#FF6B5B' }} />
              </div>
            </div>
          )}

          {/* Check in button — open before kick-off and while live (FR-2.1) */}
          {match.status !== 'finished' && (
            <button
              onClick={checkIn}
              disabled={isCheckedIn || loading}
              className={`mt-4 w-full rounded-lg py-3 px-4 text-[13px] font-body font-bold tracking-[0.04em] uppercase transition-all duration-300 flex items-center justify-center gap-1.5 min-h-[48px] cursor-pointer ${
                isCheckedIn
                  ? 'bg-white/10 text-white/50 border border-white/10 cursor-default'
                  : loading
                    ? 'bg-[#00C853] text-[#0F1117] shadow-[0_0_20px_rgba(0,200,83,0.4)]'
                    : 'bg-white text-[#0F1117] hover:bg-[#1A56DB] hover:text-white hover:shadow-[0_0_20px_rgba(26,86,219,0.4)] active:scale-[0.98]'
              }`}
            >
              {isCheckedIn ? (
                'Checked In'
              ) : loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Check In →'
              )}
            </button>
          )}

          {/* Tabs */}
          <div className="flex border-b mt-5" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
            {(['timeline', 'lineups', 'stats'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-[13px] font-semibold capitalize transition-colors border-b-2 -mb-px cursor-pointer ${
                  tab === t
                    ? 'border-white text-white'
                    : 'border-transparent text-white/50 hover:text-white/80'
                }`}
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