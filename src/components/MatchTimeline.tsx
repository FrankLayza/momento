'use client'
// Implements FR-1.2
// Events come from TxLINE's scores feed (src/server/txline/adapter.ts →
// getMatchTimeline) via /api/matches/[id]/events. TxLINE carries no player
// names, so the timeline shows team + event + minute + running score.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { TimelineEvent } from '@/server/txline/types'
import { formatMatchMinute } from '@/lib/matchUtils'

interface Props {
  matchId: string
  status: 'scheduled' | 'live' | 'finished'
  home: string
  away: string
}

const KIND: Record<TimelineEvent['kind'], { icon: string; label: string }> = {
  goal: { icon: '⚽', label: 'Goal' },
  yellow_card: { icon: '🟨', label: 'Yellow card' },
  red_card: { icon: '🟥', label: 'Red card' },
  substitution: { icon: '🔄', label: 'Substitution' },
  penalty: { icon: '🥅', label: 'Penalty awarded' },
  var: { icon: '📺', label: 'VAR review' },
}

type Row =
  | { type: 'event'; event: TimelineEvent; index: number }
  | { type: 'neutral'; event: TimelineEvent; index: number }
  | { type: 'half'; label: string }

function buildRows(events: TimelineEvent[], status: Props['status']): Row[] {
  const PHASE_ORDER: Record<string, number> = {
    H1: 1,
    HT: 2,
    H2: 3,
    FT: 4,
    ET1: 5,
    ET2: 6,
    PEN: 7,
  }

  const sorted = [...events].sort((a, b) => {
    const orderA = a.phase ? (PHASE_ORDER[a.phase] ?? 99) : 99
    const orderB = b.phase ? (PHASE_ORDER[b.phase] ?? 99) : 99
    if (orderA !== orderB) return orderA - orderB
    return a.minute - b.minute
  })

  const rows: Row[] = [{ type: 'half', label: 'Kick-off' }]

  let htInserted = false
  let et1Inserted = false
  let et2Inserted = false
  let penInserted = false

  sorted.forEach((event, index) => {
    if (!htInserted && (event.phase === "H2" || event.phase === "HT" || (event.minute > 45 && event.phase !== "H1"))) {
      rows.push({ type: 'half', label: 'Half time' })
      htInserted = true
    }
    if (!et1Inserted && (event.phase === "ET1" || event.phase === "ET2")) {
      rows.push({ type: 'half', label: 'Full time' })
      et1Inserted = true
    }
    if (!penInserted && event.phase === "PEN") {
      rows.push({ type: 'half', label: 'Penalties' })
      penInserted = true
    }
    // VAR (and any side-less event) sits centred on the spine, not left/right.
    rows.push({ type: event.team === null ? 'neutral' : 'event', event, index })
  })

  if (status === 'finished' && !et1Inserted && !penInserted) {
    if (!htInserted) {
      rows.push({ type: 'half', label: 'Half time' })
    }
    rows.push({ type: 'half', label: 'Full time' })
  } else if (status === 'finished' && (et1Inserted || et2Inserted) && !penInserted) {
    rows.push({ type: 'half', label: 'End of extra time' })
  }

  return rows
}

export function MatchTimeline({ matchId, status, home, away }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/matches/${matchId}/events`)
        const data = await res.json()
        if (!cancelled) setEvents(data.events ?? [])
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    void load()
    if (status !== 'live') return () => { cancelled = true }

    const interval = setInterval(() => void load(), 20_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [matchId, status])

  if (loaded && events.length === 0) {
    return (
      <div className="bg-cream-surface rounded-2xl border border-cream-border py-14 px-6 text-center">
        <div className="text-3xl mb-3 opacity-40">⚽</div>
        <p className="text-[13px] font-medium text-ink-secondary">
          {status === 'finished' ? 'No goals or cards in this match.' : 'No moments yet'}
        </p>
        <p className="text-[12px] text-ink-ghost mt-1">
          {status === 'finished'
            ? 'A goalless, cardless game.'
            : 'Goals and cards will appear here as the match unfolds.'}
        </p>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
        <div className="flex items-center justify-between mb-5 h-4">
          <div className="w-16 h-3 bg-cream-border rounded-full animate-pulse" />
          <div className="w-20 h-3 bg-cream-border rounded-full animate-pulse" />
          <div className="w-16 h-3 bg-cream-border rounded-full animate-pulse" />
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cream-border -translate-x-1/2" />
          <div className="flex flex-col gap-6 py-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="relative flex items-center opacity-50">
                <div className={`flex-1 flex ${i % 2 === 0 ? 'justify-end pr-4' : ''}`}>
                  {i % 2 === 0 && <div className="w-[140px] h-10 bg-cream-border/60 rounded-xl animate-pulse" />}
                </div>
                <div className="relative z-10 shrink-0">
                  <div className="w-11 h-6 rounded-full bg-cream-border/60 animate-pulse border border-cream-border" />
                </div>
                <div className={`flex-1 flex ${i % 2 !== 0 ? 'justify-start pl-4' : ''}`}>
                  {i % 2 !== 0 && <div className="w-[140px] h-10 bg-cream-border/60 rounded-xl animate-pulse" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const rows = buildRows(events, status)

  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
      {/* Team key */}
      <div className="flex items-center justify-between mb-5 text-[11px] font-medium">
        <span className="flex items-center gap-1.5 text-ink">
          <span className="w-2 h-2 rounded-full bg-ink" /> {home}
        </span>
        <span className="text-ink-ghost uppercase tracking-[0.12em] text-[10px]">Timeline</span>
        <span className="flex items-center gap-1.5 text-ink">
          {away} <span className="w-2 h-2 rounded-full bg-live" />
        </span>
      </div>

      {/* Center-spine timeline */}
      <div className="relative">
        {/* Vertical spine */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-gradient-to-b from-transparent via-cream-border to-transparent -translate-x-1/2" />

        <div className="flex flex-col gap-3">
          {rows.map((row, i) => {
            if (row.type === 'half') {
              return (
                <div key={`half-${i}`} className="relative flex justify-center py-0.5">
                  <span className="relative z-10 bg-cream-muted text-ink-secondary text-[10px] font-display font-bold tracking-[0.08em] uppercase rounded-full px-3 py-1">
                    {row.label}
                  </span>
                </div>
              )
            }

            if (row.type === 'neutral') {
              const meta = KIND[row.event.kind]
              return (
                <div key={`neutral-${row.index}`} className="relative flex justify-center py-0.5">
                  <span className="relative z-10 flex items-center gap-1.5 bg-cream-surface text-ink-secondary text-[11px] font-medium rounded-full border border-cream-border px-3 py-1 shadow-sm transition-transform hover:scale-105 cursor-default">
                    <span className="text-[12px] leading-none">{meta.icon}</span>
                    {meta.label}
                    <span className="text-ink-ghost font-display font-bold">{formatMatchMinute(row.event.minute, row.event.phase)}&apos;</span>
                  </span>
                </div>
              )
            }

            const ev = row.event
            const isHome = ev.team === 'home'
            const meta = KIND[ev.kind]
            const isGoal = ev.kind === 'goal'

            return (
              <motion.div
                key={`ev-${row.index}`}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25, delay: Math.min(row.index * 0.05, 0.5) }}
                className="relative flex items-center group"
              >
                {/* Home side (left) */}
                <div className={`flex-1 flex ${isHome ? 'justify-end pr-4' : ''}`}>
                  {isHome && (
                    <EventCard icon={meta.icon} label={meta.label} isGoal={isGoal}
                      score={isGoal ? `${ev.scoreHome}-${ev.scoreAway}` : null} align="right" />
                  )}
                </div>

                {/* Minute node on the spine */}
                <div className="relative z-10 shrink-0 transition-transform group-hover:scale-110">
                  <div className={`w-11 h-6 rounded-full flex items-center justify-center font-display text-[11px] font-bold border shadow-sm ${
                    isGoal
                      ? 'bg-ink text-cream border-ink shadow-md'
                      : 'bg-cream-surface text-ink-secondary border-cream-border'
                  }`}>
                    {formatMatchMinute(ev.minute, ev.phase)}&apos;
                  </div>
                </div>

                {/* Away side (right) */}
                <div className={`flex-1 flex ${!isHome ? 'justify-start pl-4' : ''}`}>
                  {!isHome && (
                    <EventCard icon={meta.icon} label={meta.label} isGoal={isGoal}
                      score={isGoal ? `${ev.scoreHome}-${ev.scoreAway}` : null} align="left" />
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventCard({
  icon,
  label,
  score,
  isGoal,
  align,
}: {
  icon: string
  label: string
  score: string | null
  isGoal: boolean
  align: 'left' | 'right'
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 max-w-[180px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md cursor-default ${
        isGoal ? 'bg-cream border-ink/15 shadow-sm' : 'bg-cream border-cream-border'
      } ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}
    >
      <span className="text-[14px] leading-none shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-ink leading-tight truncate">{label}</p>
        {score && (
          <p className="text-[13px] font-display font-bold text-ink leading-tight tabular-nums">{score}</p>
        )}
      </div>
    </div>
  )
}
