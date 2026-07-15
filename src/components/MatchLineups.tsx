'use client'
// Implements FR-1.2
// Real player names/formations come from API-Football (src/server/football/adapter.ts)
// via /api/matches/[id]/lineups — TxLINE has no roster data. Falls back to an
// unnamed jersey-number mock if lineups aren't available yet (pre-kickoff, or
// no API-Football key configured).

import { useEffect, useState } from 'react'
import type { FootballLineupPlayer, FootballLineups } from '@/server/football/types'

interface Props {
  matchId: string
  home: string
  away: string
}

const MOCK_AWAY_NUMBERS: number[][] = [[1], [2, 4, 5, 3], [6, 8, 10], [7, 9, 11]]
const MOCK_HOME_NUMBERS: number[][] = [[9], [7, 10, 11], [4, 8], [2, 5, 6, 3], [1]]

function groupByPosition(players: FootballLineupPlayer[]) {
  return {
    gk: players.filter((p) => p.position === 'G'),
    def: players.filter((p) => p.position === 'D'),
    mid: players.filter((p) => p.position === 'M'),
    fwd: players.filter((p) => p.position === 'F'),
  }
}

function PlayerToken({ number, name, dark }: { number: number; name?: string; dark: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-display text-[12px] font-bold border-2 border-white/30 shadow-sm ${
          dark ? 'bg-ink text-cream' : 'bg-live text-cream'
        }`}
      >
        {number || '·'}
      </div>
      {name && (
        <span className="text-[9px] text-[#3A5C2A] font-medium text-center leading-tight max-w-[64px] truncate">
          {name}
        </span>
      )}
    </div>
  )
}

export function MatchLineups({ matchId, home, away }: Props) {
  const [lineups, setLineups] = useState<FootballLineups | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/matches/${matchId}/lineups`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setLineups(data.lineups ?? null) })
      .catch(() => { if (!cancelled) setLineups(null) })
      .finally(() => { if (!cancelled) setLoaded(true) })

    return () => { cancelled = true }
  }, [matchId])

  const awayRows = lineups
    ? (() => {
        const g = groupByPosition(lineups.away.startXI)
        return [g.gk, g.def, g.mid, g.fwd].filter((r) => r.length > 0)
      })()
    : null

  const homeRows = lineups
    ? (() => {
        const g = groupByPosition(lineups.home.startXI)
        return [g.fwd, g.mid, g.def, g.gk].filter((r) => r.length > 0)
      })()
    : null

  const homeFormation = lineups?.home.formation ?? '—'
  const awayFormation = lineups?.away.formation ?? '—'

  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
      <div className="flex gap-4 mb-4 text-[11px] text-ink-ghost font-medium">
        <span>{home} <strong className="text-ink font-display">{homeFormation}</strong></span>
        <span>·</span>
        <span>{away} <strong className="text-ink font-display">{awayFormation}</strong></span>
      </div>

      <div
        className="bg-[#C8DDB8] rounded-xl p-6 flex flex-col justify-between gap-8 relative overflow-hidden"
        style={{ minHeight: 560 }}
      >
        {/* Pitch markings */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/20 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Away Team (Top Half) */}
        <div className="flex flex-col justify-start gap-6 z-10">
          {(awayRows ?? MOCK_AWAY_NUMBERS.map((row) => row.map((number) => ({ number, name: '', position: null })))).map(
            (row, ri) => (
              <div key={`away-${ri}`} className="flex justify-center gap-2">
                {row.map((p, pi) => (
                  <PlayerToken key={`away-${ri}-${pi}`} number={p.number} name={p.name} dark={false} />
                ))}
              </div>
            )
          )}
        </div>

        {/* Home Team (Bottom Half) */}
        <div className="flex flex-col justify-end gap-6 z-10">
          {(homeRows ?? MOCK_HOME_NUMBERS.map((row) => row.map((number) => ({ number, name: '', position: null })))).map(
            (row, ri) => (
              <div key={`home-${ri}`} className="flex justify-center gap-2">
                {row.map((p, pi) => (
                  <PlayerToken key={`home-${ri}-${pi}`} number={p.number} name={p.name} dark />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {loaded && !lineups && (
        <p className="text-center text-[11px] text-ink-ghost mt-3">
          Lineups not available yet.
        </p>
      )}

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-ink" />
          <span className="text-[11px] text-ink-secondary">{home}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-live" />
          <span className="text-[11px] text-ink-secondary">{away}</span>
        </div>
      </div>
    </div>
  )
}
