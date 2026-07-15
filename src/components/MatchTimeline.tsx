'use client'
// Implements FR-1.2
// Events come from API-Football (src/server/football/adapter.ts) via
// /api/matches/[id]/events — TxLINE only has scores/odds, not match events.

import { useEffect, useState } from 'react'
import type { FootballTimelineEvent } from '@/server/football/types'

interface Props {
  matchId: string
  status: 'scheduled' | 'live' | 'finished'
}

const KIND_ICON: Record<string, string> = {
  goal: '⚽',
  penalty_goal: '⚽',
  own_goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
}

type Row =
  | { type: 'event'; event: FootballTimelineEvent }
  | { type: 'divider'; label: string }
  | { type: 'pill'; label: string }

function scoreThrough(events: FootballTimelineEvent[]): { home: number; away: number } {
  let home = 0
  let away = 0
  for (const e of events) {
    if (e.kind === 'goal' || e.kind === 'penalty_goal') {
      if (e.team === 'home') home++
      else away++
    } else if (e.kind === 'own_goal') {
      // an own goal counts for the opposing side
      if (e.team === 'home') away++
      else home++
    }
  }
  return { home, away }
}

function buildRows(events: FootballTimelineEvent[], status: Props['status']): Row[] {
  const sorted = [...events].sort((a, b) => a.minute - b.minute)
  const firstHalf = sorted.filter((e) => e.minute <= 45)
  const secondHalf = sorted.filter((e) => e.minute > 45)

  const rows: Row[] = []
  for (const e of [...secondHalf].reverse()) rows.push({ type: 'event', event: e })

  if (secondHalf.length > 0 || status === 'finished') {
    const ht = scoreThrough(firstHalf)
    rows.push({ type: 'divider', label: `HT ${ht.home} - ${ht.away}` })

    const firstHalfExtra = firstHalf.reduce((max, e) => Math.max(max, e.extraMinute ?? 0), 0)
    if (firstHalfExtra > 0) {
      rows.push({ type: 'pill', label: `Additional time ${firstHalfExtra} min` })
    }
  }

  for (const e of [...firstHalf].reverse()) rows.push({ type: 'event', event: e })
  return rows
}

export function MatchTimeline({ matchId, status }: Props) {
  const [events, setEvents] = useState<FootballTimelineEvent[]>([])
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
      <div className="text-center py-10 text-ink-ghost text-[13px]">
        Events will appear here as the match progresses.
      </div>
    )
  }

  const rows = buildRows(events, status)

  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border overflow-hidden">
      {rows.map((row, i) => {
        if (row.type === 'divider') {
          return (
            <div key={`divider-${i}`} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 h-px bg-cream-border" />
              <span className="text-[11px] font-display font-bold text-live tracking-wide flex-shrink-0">
                {row.label}
              </span>
              <div className="flex-1 h-px bg-cream-border" />
            </div>
          )
        }

        if (row.type === 'pill') {
          return (
            <div key={`pill-${i}`} className="flex justify-center py-2.5">
              <span className="text-[11px] font-medium text-ink-secondary bg-cream-muted rounded-full px-3 py-1">
                {row.label}
              </span>
            </div>
          )
        }

        const ev = row.event
        const minuteLabel = `${ev.minute}${ev.extraMinute ? '+' + ev.extraMinute : ''}'`
        const teamDotColor = ev.team === 'home' ? 'bg-ink' : 'bg-live'

        return (
          <div
            key={`event-${i}`}
            className={`flex items-center gap-3 px-5 py-3.5 ${
              i < rows.length - 1 ? 'border-b border-cream-border' : ''
            }`}
          >
            <span className="font-display text-[11px] font-bold text-ink-ghost w-9 text-right flex-shrink-0">
              {minuteLabel}
            </span>

            {ev.kind === 'substitution' ? (
              <div className="w-6 h-6 flex flex-col items-center justify-center flex-shrink-0 text-[10px] leading-none gap-0.5">
                <span className="text-emerald-600">▲</span>
                <span className="text-live">▼</span>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] flex-shrink-0">
                {KIND_ICON[ev.kind] ?? '•'}
              </div>
            )}

            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${teamDotColor}`} />

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-ink truncate">
                {ev.player ?? '—'}
                {ev.kind === 'own_goal' ? ' (OG)' : ''}
              </p>
              <p className="text-[11px] text-ink-ghost truncate">
                {ev.kind === 'yellow_card' || ev.kind === 'red_card'
                  ? 'Foul'
                  : ev.kind === 'substitution'
                    ? `${ev.secondaryPlayer ?? '—'} off`
                    : ev.secondaryPlayer
                      ? `Assist: ${ev.secondaryPlayer}`
                      : ev.team}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
