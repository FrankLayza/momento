'use client'
// Implements FR-1.2
// Team stats (possession, shots, corners, cards, etc.) counted from TxLINE's
// scores feed (src/server/txline/adapter.ts → getMatchStats) via
// /api/matches/[id]/stats. Coverage varies, so this may be null.

import { useEffect, useState } from 'react'
import type { MatchStats, TeamStats } from '@/server/txline/types'

interface Props {
  matchId: string
  status: 'scheduled' | 'live' | 'finished'
  home: string
  away: string
}

const ROWS: Array<{ key: keyof TeamStats; label: string; isPercent?: boolean }> = [
  { key: 'possession', label: 'Possession', isPercent: true },
  { key: 'shots', label: 'Shots' },
  { key: 'corners', label: 'Corners' },
  { key: 'freeKicks', label: 'Free kicks' },
  { key: 'throwIns', label: 'Throw-ins' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'yellowCards', label: 'Yellow cards' },
  { key: 'redCards', label: 'Red cards' },
  { key: 'penalties', label: 'Penalties' },
]

function StatRow({ label, home, away, isPercent }: { label: string; home: number; away: number; isPercent?: boolean }) {
  const total = home + away
  const homePct = total > 0 ? (home / total) * 100 : 50
  const awayPct = 100 - homePct
  const homeLeads = home > away
  const awayLeads = away > home

  return (
    <div className="py-3">
      <div className="flex items-center justify-between text-[13px] mb-1.5">
        <span className={`font-display font-bold tabular-nums ${homeLeads ? 'text-ink' : 'text-ink-secondary'}`}>
          {home}{isPercent ? '%' : ''}
        </span>
        <span className="text-[11px] font-medium text-ink-ghost uppercase tracking-wide">{label}</span>
        <span className={`font-display font-bold tabular-nums ${awayLeads ? 'text-ink' : 'text-ink-secondary'}`}>
          {away}{isPercent ? '%' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1 h-1.5">
        <div className="flex-1 flex justify-end">
          <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${homePct}%` }} />
        </div>
        <div className="flex-1">
          <div className="h-full rounded-full bg-live transition-all" style={{ width: `${awayPct}%` }} />
        </div>
      </div>
    </div>
  )
}

export function MatchStats({ matchId, status, home, away }: Props) {
  const [stats, setStats] = useState<MatchStats | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/matches/${matchId}/stats`)
        const data = await res.json()
        if (!cancelled) setStats(data.stats ?? null)
      } catch {
        if (!cancelled) setStats(null)
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    void load()
    if (status !== 'live') return () => { cancelled = true }
    const interval = setInterval(() => void load(), 20_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [matchId, status])

  if (!loaded) {
    return (
      <div className="bg-cream-surface rounded-2xl border border-cream-border py-14 text-center text-[13px] text-ink-ghost">
        Loading stats…
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-cream-surface rounded-2xl border border-cream-border py-14 px-6 text-center">
        <div className="text-3xl mb-3 opacity-40">📊</div>
        <p className="text-[13px] font-medium text-ink-secondary">No stats yet</p>
        <p className="text-[12px] text-ink-ghost mt-1">
          {status === 'scheduled' ? 'Stats build up once the match kicks off.' : 'No stats available for this match.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
      {/* Team key */}
      <div className="flex items-center justify-between mb-4 text-[11px] font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <span className="w-2 h-2 rounded-full bg-ink" /> {home}
        </span>
        <span className="text-ink-ghost uppercase tracking-[0.12em] text-[10px]">Match stats</span>
        <span className="flex items-center gap-1.5 text-ink">
          {away} <span className="w-2 h-2 rounded-full bg-live" />
        </span>
      </div>

      <div className="divide-y divide-cream-border">
        {ROWS.map((r) => (
          <StatRow
            key={r.key}
            label={r.label}
            home={stats.home[r.key]}
            away={stats.away[r.key]}
            isPercent={r.isPercent}
          />
        ))}
      </div>
    </div>
  )
}
