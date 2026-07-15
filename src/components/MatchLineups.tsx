'use client'
// Implements FR-1.2
// Real starting XIs, bench, numbers and formations come from TxLINE's `lineups`
// action record (src/server/txline/adapter.ts → getMatchLineups) via
// /api/matches/[id]/lineups. Coverage varies by fixture, so when no lineup
// record exists this falls back to a clearly-labelled formation preview.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { LineupPlayer, MatchLineups } from '@/server/txline/types'

interface Props {
  matchId: string
  home: string
  away: string
}

// Generic 4-3-3 used for the preview pitch when a fixture has no lineup data.
const PREVIEW_AWAY: number[][] = [[1], [2, 5, 4, 3], [6, 8, 10], [7, 9, 11]]
const PREVIEW_HOME: number[][] = [[9, 11, 7], [10, 8, 6], [3, 4, 5, 2], [1]]

function pitchRows(startXI: LineupPlayer[], order: Array<LineupPlayer['position']>) {
  return order
    .map((pos) => startXI.filter((p) => p.position === pos))
    .filter((row) => row.length > 0)
}

function PlayerToken({ number, name, dark, isLoading }: { number: number; name?: string; dark: boolean; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full border-2 border-white/20 bg-white/10 animate-pulse shadow-sm" />
        <div className="w-12 h-2 bg-white/10 rounded-full animate-pulse mt-1" />
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 group cursor-default relative">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-display text-[12px] font-bold border-2 border-white/40 shadow-[0_2px_6px_rgba(0,0,0,0.25)] transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:-translate-y-0.5 group-hover:border-white/70 ${
          dark ? 'bg-ink text-cream' : 'bg-live text-cream'
        }`}
      >
        {number || '·'}
      </div>
      {name && (
        <span className="text-[9px] text-white font-semibold text-center leading-tight max-w-[76px] line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-all group-hover:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {name}
        </span>
      )}
    </div>
  )
}

function BenchList({ label, players, dark }: { label: string; players: LineupPlayer[]; dark: boolean }) {
  if (players.length === 0) return null
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`w-2 h-2 rounded-full ${dark ? 'bg-ink' : 'bg-live'}`} />
        <span className="text-[10px] font-display font-bold uppercase tracking-[0.08em] text-ink-secondary">{label}</span>
      </div>
      <ul className="space-y-1">
        {players.map((p, i) => (
          <li key={i} className="flex items-baseline gap-2 text-[12px] text-ink-secondary">
            <span className="font-display font-bold text-ink-ghost w-5 text-right tabular-nums">{p.number || '·'}</span>
            <span className="truncate">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MatchLineups({ matchId, home, away }: Props) {
  const [lineups, setLineups] = useState<MatchLineups | null>(null)
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

  const isLoading = !loaded
  const isPreview = loaded && !lineups

  // Home plays top-down (GK at very top), away plays bottom-up (GK at very bottom).
  const homeRows = lineups
    ? pitchRows(lineups.home.startXI, ['G', 'D', 'M', 'F'])
    : PREVIEW_AWAY.map((row) => row.map((number) => ({ number, name: '', position: null, starter: true } as LineupPlayer)))

  const awayRows = lineups
    ? pitchRows(lineups.away.startXI, ['F', 'M', 'D', 'G'])
    : PREVIEW_HOME.map((row) => row.map((number) => ({ number, name: '', position: null, starter: true } as LineupPlayer)))

  const homeFormation = lineups?.home.formation ?? (isLoading ? '···' : '4-3-3')
  const awayFormation = lineups?.away.formation ?? (isLoading ? '···' : '4-3-3')

  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
      {/* Header: teams + formations + status */}
      <div className="flex items-center justify-between mb-4 h-6">
        <div className="flex gap-3 text-[11px] text-ink-ghost font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ink" />
            {home} <strong className="text-ink font-display">{homeFormation}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-live" />
            {away} <strong className="text-ink font-display">{awayFormation}</strong>
          </span>
        </div>
        {isPreview && (
          <span className="text-[9px] font-display font-bold tracking-[0.1em] uppercase text-ink-ghost bg-cream-muted rounded-full px-2.5 py-1">
            Preview
          </span>
        )}
      </div>

      {/* Pitch */}
      <div
        className="rounded-xl p-6 flex flex-col justify-between gap-8 relative overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.3)]"
        style={{ minHeight: 560, background: 'radial-gradient(ellipse at center, #4f9653 0%, #3f7d43 100%)' }}
      >
        {/* Grass stripes */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.04)_0px,rgba(255,255,255,0.04)_48px,transparent_48px,transparent_96px)] pointer-events-none" />
        {/* Pitch markings */}
        <div className="absolute inset-x-6 top-1/2 h-px bg-white/25 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border border-white/25 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-14 border border-t-0 border-white/20 rounded-b-md" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-14 border border-b-0 border-white/20 rounded-t-md" />

        {/* Home Team (Top Half) */}
        <div className="flex flex-col justify-start gap-6 z-10">
          {homeRows.map((row, ri) => (
            <motion.div 
              key={`home-${ri}`} 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: ri * 0.1 }}
              className="flex justify-center gap-2"
            >
              {row.map((p, pi) => (
                <PlayerToken key={`home-${ri}-${pi}`} number={p.number} name={lineups ? p.name : ''} dark isLoading={isLoading} />
              ))}
            </motion.div>
          ))}
        </div>

        {/* Away Team (Bottom Half) */}
        <div className="flex flex-col justify-end gap-6 z-10">
          {awayRows.map((row, ri) => (
            <motion.div 
              key={`away-${ri}`} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25, delay: (homeRows.length + ri) * 0.1 }}
              className="flex justify-center gap-2"
            >
              {row.map((p, pi) => (
                <PlayerToken key={`away-${ri}-${pi}`} number={p.number} name={lineups ? p.name : ''} dark={false} isLoading={isLoading} />
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bench (only with real data) */}
      {lineups && (lineups.home.bench.length > 0 || lineups.away.bench.length > 0) && (
        <div className="flex gap-6 mt-5">
          <BenchList label={`${home} bench`} players={lineups.home.bench} dark />
          <BenchList label={`${away} bench`} players={lineups.away.bench} dark={false} />
        </div>
      )}

      {/* Caption */}
      <p className="text-center text-[11px] text-ink-ghost mt-4">
        {!loaded
          ? 'Loading line-ups…'
          : isPreview
            ? 'Confirmed line-ups appear about an hour before kick-off.'
            : `${home} v ${away} starting XI`}
      </p>
    </div>
  )
}
