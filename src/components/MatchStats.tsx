'use client'
// Implements FR-1.2
// Team stats (possession, shots, corners, cards, etc.) counted from TxLINE's
// scores feed (src/server/txline/adapter.ts → getMatchStats) via
// /api/matches/[id]/stats. Coverage varies, so this may be null.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
    <div className="py-3 px-2 -mx-2 rounded-lg transition-colors hover:bg-cream-border/20 group">
      <div className="flex items-center justify-between text-[13px] mb-1.5">
        <span className={`font-display font-bold tabular-nums transition-colors group-hover:text-ink ${homeLeads ? 'text-ink' : 'text-ink-secondary'}`}>
          {home}{isPercent ? '%' : ''}
        </span>
        <span className="text-[11px] font-medium text-ink-ghost uppercase tracking-wide transition-colors group-hover:text-ink-secondary">{label}</span>
        <span className={`font-display font-bold tabular-nums transition-colors group-hover:text-ink ${awayLeads ? 'text-ink' : 'text-ink-secondary'}`}>
          {away}{isPercent ? '%' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1 h-1.5 overflow-hidden">
        <div className="flex-1 flex justify-end">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${homePct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
            className="h-full rounded-full bg-ink" 
          />
        </div>
        <div className="flex-1">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${awayPct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
            className="h-full rounded-full bg-live" 
          />
        </div>
      </div>
    </div>
  )
}

function MomentumChart({ data }: { data: MatchStats['momentum'] }) {
  if (!data || data.length === 0) return null
  
  // Find max absolute value to scale height (minimum 50 to avoid tiny spikes looking huge)
  const maxVal = Math.max(50, ...data.map(d => Math.abs(d.value)))
  
  // SVG dimensions
  const width = 1000
  const height = 120
  
  // Scale X-axis exactly to the actual match length (minimum 90)
  const chartMaxMinute = Math.max(90, ...data.map(d => d.minute))
  const barWidth = width / chartMaxMinute
  
  // Demarcation points (only add ET markers if the match actually went that long)
  const markers = [45, 90]
  if (chartMaxMinute > 100) markers.push(105)
  if (chartMaxMinute >= 120) markers.push(120)
  
  return (
    <div className="py-4 border-b border-cream-border mb-4">
      <div className="flex items-center justify-between text-[11px] font-medium text-ink-ghost uppercase tracking-[0.12em] mb-4">
        <span>Attack Momentum</span>
      </div>
      <div className="relative w-full h-[120px] bg-cream-base/50 rounded-md overflow-hidden">
        {/* Center line */}
        <div className="absolute top-1/2 left-0 w-full h-px bg-cream-border z-10" />
         
        <motion.svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full preserve-3d relative z-0 origin-center" 
          preserveAspectRatio="none"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Vertical Demarcation Lines */}
          {markers.map(m => (
            <line 
              key={`marker-${m}`}
              x1={m * barWidth} 
              y1={0} 
              x2={m * barWidth} 
              y2={height} 
              stroke="currentColor" 
              strokeWidth={2} 
              strokeDasharray="4 4" 
              className="text-cream-border"
            />
          ))}
          
          {/* Momentum Bars */}
          {data.map((d, i) => {
            if (d.value === 0) return null
            const isHome = d.value > 0
            const normalizedHeight = (Math.abs(d.value) / maxVal) * (height / 2)
            const x = (d.minute - 1) * barWidth
            const y = isHome ? (height / 2) - normalizedHeight : (height / 2)
              
            return (
              <rect 
                key={i} 
                x={x} 
                y={y} 
                width={Math.max(1.5, barWidth - 1.5)} 
                height={normalizedHeight} 
                className={isHome ? "fill-ink" : "fill-live"}
                rx="2"
              />
            )
          })}
        </motion.svg>
      </div>
      
      {/* Precisely aligned X-axis labels */}
      <div className="relative w-full h-4 mt-2 text-[10px] text-ink-ghost font-medium tabular-nums">
        <span className="absolute left-0">0&apos;</span>
        {markers.map(m => (
          <span 
            key={`label-${m}`} 
            className="absolute -translate-x-1/2 bg-cream-surface px-1" 
            style={{ left: `${(m / chartMaxMinute) * 100}%` }}
          >
            {m === 45 ? 'HT' : m === chartMaxMinute ? 'FT' : `${m}'`}
          </span>
        ))}
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
      <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
        <div className="flex items-center justify-between mb-4 h-4">
          <div className="w-16 h-3 bg-cream-border rounded-full animate-pulse" />
          <div className="w-20 h-3 bg-cream-border rounded-full animate-pulse" />
          <div className="w-16 h-3 bg-cream-border rounded-full animate-pulse" />
        </div>
        
        <div className="w-full h-[120px] bg-cream-border/30 rounded-md animate-pulse mb-6 mt-4" />
        
        <div className="divide-y divide-cream-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-1">
                <div className="w-6 h-3 bg-cream-border rounded animate-pulse" />
                <div className="w-16 h-2 bg-cream-border/70 rounded animate-pulse" />
                <div className="w-6 h-3 bg-cream-border rounded animate-pulse" />
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="flex-1 bg-cream-border/50 rounded-full animate-pulse" />
                <div className="flex-1 bg-cream-border/50 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
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

      <MomentumChart data={stats.momentum} />

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
