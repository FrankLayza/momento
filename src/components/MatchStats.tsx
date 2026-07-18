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
  /** Current match minute — drives the momentum chart's X-axis range for live matches */
  currentMinute?: number | null
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
    <div className="py-3 px-2 -mx-2 rounded-lg transition-colors" style={{ '--hover-bg': 'var(--color-surface-2)' } as React.CSSProperties}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <div className="flex items-center justify-between text-[13px] mb-1.5">
        <span className="font-display font-bold tabular-nums" style={{ color: homeLeads ? 'var(--color-fore)' : 'var(--color-fore-3)' }}>
          {home}{isPercent ? '%' : ''}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-fore-3)' }}>{label}</span>
        <span className="font-display font-bold tabular-nums" style={{ color: awayLeads ? 'var(--color-fore)' : 'var(--color-fore-3)' }}>
          {away}{isPercent ? '%' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1 h-1.5 overflow-hidden">
        <div className="flex-1 flex justify-end">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${homePct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
            className="h-full rounded-full"
            style={{ background: 'var(--color-blue)' }}
          />
        </div>
        <div className="flex-1">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${awayPct}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.1 }}
            className="h-full rounded-full"
            style={{ background: 'var(--color-live)' }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Applies a rolling window average to smooth the raw per-minute momentum
 * values into a FotMob-style flowing chart instead of isolated spiky bars.
 */
function smoothMomentum(
  data: Array<{ minute: number; value: number }>,
  windowSize: number = 3
): Array<{ minute: number; value: number }> {
  if (data.length === 0) return data;
  const half = Math.floor(windowSize / 2);
  return data.map((d, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(data.length - 1, i + half); j++) {
      sum += data[j]!.value;
      count++;
    }
    return { minute: d.minute, value: sum / count };
  });
}

function MomentumChart({ data, currentMinute }: { data: MatchStats['momentum']; currentMinute?: number | null }) {
  if (!data || data.length === 0) return null

  // Smooth with a 3-minute rolling window for a flowing, FotMob-style look
  const smoothed = smoothMomentum(data, 3);
  
  // Find max absolute value to scale height (minimum 20 to avoid tiny spikes looking huge)
  const maxVal = Math.max(20, ...smoothed.map(d => Math.abs(d.value)))
  
  // SVG dimensions
  const width = 1000
  const height = 120
  
  // Dynamic X-axis: for live matches scale to the current minute (floor 20 for
  // very early matches); for finished matches use the actual data extent or 90.
  const dataMaxMinute = data.length > 0 ? Math.max(...data.map(d => d.minute)) : 0;
  let chartMaxMinute: number;
  if (currentMinute && currentMinute > 0) {
    // Live: axis extends ~5' past the current minute for breathing room, minimum 20
    chartMaxMinute = Math.max(20, currentMinute + 5);
  } else {
    // Finished or unknown: fit to data, minimum 90
    chartMaxMinute = Math.max(90, dataMaxMinute);
  }
  const barWidth = width / chartMaxMinute
  
  // Demarcation points — only show markers that fall within the visible range
  const allMarkers = [45, 90, 105, 120]
  const markers = allMarkers.filter(m => m <= chartMaxMinute)
  
    const centerY = height / 2; // 60
    
    // Build Home and Away area paths
    let homePath = `M 0 ${centerY}`;
    let awayPath = `M 0 ${centerY}`;
    let homeEnvelope = "";
    let awayEnvelope = "";
    
    let inHome = false;
    let inAway = false;
    let lastX = 0;
    
    smoothed.forEach((d) => {
      if (d.minute > chartMaxMinute) return;
      const x = (d.minute - 1) * barWidth;
      lastX = x;
      
      // Home (above center)
      if (d.value > 0) {
        const y = centerY - (d.value / maxVal) * (centerY - 6);
        homePath += ` L ${x} ${y}`;
        if (!inHome) {
          homeEnvelope += ` M ${x} ${centerY} L ${x} ${y}`;
          inHome = true;
        } else {
          homeEnvelope += ` L ${x} ${y}`;
        }
      } else {
        homePath += ` L ${x} ${centerY}`;
        if (inHome) {
          homeEnvelope += ` L ${x} ${centerY}`;
          inHome = false;
        }
      }
      
      // Away (below center)
      if (d.value < 0) {
        const y = centerY + (Math.abs(d.value) / maxVal) * (centerY - 6);
        awayPath += ` L ${x} ${y}`;
        if (!inAway) {
          awayEnvelope += ` M ${x} ${centerY} L ${x} ${y}`;
          inAway = true;
        } else {
          awayEnvelope += ` L ${x} ${y}`;
        }
      } else {
        awayPath += ` L ${x} ${centerY}`;
        if (inAway) {
          awayEnvelope += ` L ${x} ${centerY}`;
          inAway = false;
        }
      }
    });
    
    // Close the shapes to the center line
    homePath += ` L ${lastX} ${centerY} Z`;
    awayPath += ` L ${lastX} ${centerY} Z`;

    return (
        <div className="py-4 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--color-fore-3)' }}>
          <span>Attack Momentum</span>
        </div>
        <div className="relative w-full h-[120px] rounded-md overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
          {/* Center line */}
          <div className="absolute top-1/2 left-0 w-full h-px z-10" style={{ background: 'var(--color-border)' }} />
           
          <motion.svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full h-full preserve-3d relative z-0 origin-center" 
            preserveAspectRatio="none"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {/* SVG Gradients */}
            <defs>
              <linearGradient id="home-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-ink)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-ink)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="away-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-live)" stopOpacity="0" />
                <stop offset="100%" stopColor="var(--color-live)" stopOpacity="0.22" />
              </linearGradient>
            </defs>

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
            
            {/* Home momentum area and stroke */}
            <path d={homePath} fill="url(#home-grad)" />
            {homeEnvelope && <path d={homeEnvelope} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
            
            {/* Away momentum area and stroke */}
            <path d={awayPath} fill="url(#away-grad)" />
            {awayEnvelope && <path d={awayEnvelope} fill="none" stroke="var(--color-live)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          </motion.svg>
        </div>
      
      {/* Precisely aligned X-axis labels */}
        <div className="relative w-full h-4 mt-2 text-[10px] font-medium tabular-nums" style={{ color: 'var(--color-fore-3)' }}>
        <span className="absolute left-0">0&apos;</span>
        {markers.map(m => (
          <span 
            key={`label-${m}`} 
            className="absolute -translate-x-1/2 px-1" 
            style={{ 
              background: 'var(--color-surface)', 
              color: 'var(--color-fore-3)',
              left: `${(m / chartMaxMinute) * 100}%` 
            }}
          >
            {m === 45 ? 'HT' : m === 90 && chartMaxMinute <= 95 ? 'FT' : `${m}'`}
          </span>
        ))}
        {/* Show current minute marker for live matches */}
        {currentMinute && currentMinute > 0 && (
          <span 
            className="absolute -translate-x-1/2 text-live font-bold" 
            style={{ left: `${(currentMinute / chartMaxMinute) * 100}%` }}
          >
            {currentMinute}&apos;
          </span>
        )}
      </div>
    </div>
  )
}

export function MatchStats({ matchId, status, home, away, currentMinute }: Props) {
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
      <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-4 h-4">
          <div className="w-16 h-3 rounded-full animate-pulse" style={{ background: 'var(--color-border)' }} />
          <div className="w-20 h-3 rounded-full animate-pulse" style={{ background: 'var(--color-border)' }} />
          <div className="w-16 h-3 rounded-full animate-pulse" style={{ background: 'var(--color-border)' }} />
        </div>
        <div className="w-full h-[120px] rounded-md animate-pulse mb-6 mt-4" style={{ background: 'var(--color-surface-2)' }} />
        <div className="divide-y" style={{ borderColor: 'var(--color-border-muted)' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="py-3 flex flex-col gap-2.5">
              <div className="flex justify-between items-center px-1">
                <div className="w-6 h-3 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
                <div className="w-16 h-2 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
                <div className="w-6 h-3 rounded animate-pulse" style={{ background: 'var(--color-border)' }} />
              </div>
              <div className="flex gap-1 h-1.5">
                <div className="flex-1 rounded-full animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
                <div className="flex-1 rounded-full animate-pulse" style={{ background: 'var(--color-surface-2)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-2xl py-14 px-6 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="text-3xl mb-3 opacity-40">📊</div>
        <p className="text-[13px] font-semibold" style={{ color: 'var(--color-fore-2)' }}>No stats yet</p>
        <p className="text-[12px] mt-1" style={{ color: 'var(--color-fore-3)' }}>
          {status === 'scheduled' ? 'Stats build up once the match kicks off.' : 'No stats available for this match.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {/* Team key */}
      <div className="flex items-center justify-between mb-4 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-fore)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-blue)' }} /> {home}
        </span>
        <span className="uppercase tracking-[0.12em] text-[10px]" style={{ color: 'var(--color-fore-3)' }}>Match stats</span>
        <span className="flex items-center gap-1.5" style={{ color: 'var(--color-fore)' }}>
          {away} <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-live)' }} />
        </span>
      </div>

      <MomentumChart data={stats.momentum} currentMinute={status === 'live' ? currentMinute : undefined} />

      <div className="divide-y" style={{ borderColor: 'var(--color-border-muted)' }}>
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
