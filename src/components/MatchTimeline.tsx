'use client'
// Implements FR-1.2
// TODO: wire events from TxLINE adapter subscribeMatch()

const TIER_BADGE: Record<string, string> = {
  Seismic: 'bg-red-50 text-red-700',
  Shock: 'bg-amber-50 text-amber-700',
  Notable: 'bg-cyan/10 text-cyan',
}

interface TimelineEvent {
  minute: number
  kind: 'goal' | 'red_card' | 'yellow_card' | 'kickoff' | 'full_time'
  team: 'home' | 'away' | null
  player?: string
  tier?: 'Seismic' | 'Shock' | 'Notable'
}

const KIND_ICON: Record<string, string> = {
  goal: '⚽',
  red_card: '🟥',
  yellow_card: '🟨',
}

export function MatchTimeline({ matchId }: { matchId: string }) {
  // TODO: subscribe to live events via useMatchMoments hook
  const events: TimelineEvent[] = []

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-ink-ghost text-[13px]">
        Events will appear here as the match progresses.
      </div>
    )
  }

  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border overflow-hidden">
      {events.map((ev, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-5 py-3.5 ${
            i < events.length - 1 ? 'border-b border-cream-border' : ''
          }`}
        >
          <span className="font-display text-[11px] font-bold text-ink-ghost w-8 text-right flex-shrink-0">
            {ev.minute}'
          </span>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] flex-shrink-0">
            {KIND_ICON[ev.kind] ?? '•'}
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium text-ink">{ev.player ?? ev.kind}</p>
            <p className="text-[11px] text-ink-ghost capitalize">{ev.team}</p>
          </div>
          {ev.tier && (
            <span className={`text-[9px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded ${TIER_BADGE[ev.tier]}`}>
              {ev.tier}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
