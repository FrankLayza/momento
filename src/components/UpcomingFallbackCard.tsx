// Implements FR-1.1 — fallback for the live-ticket slot when no match is live
// Check-in is open before kick-off too (FR-2.1), so this card carries the button.
'use client'

import { useRouter } from 'next/navigation'
import { flagUrl } from '@/lib/teamFlags'
import { copy } from '@/lib/copy'
import { CheckinButton } from '@/components/CheckinButton'
import type { NormalisedMatch } from '@/server/txline/types'

interface Props {
  match: NormalisedMatch
  initialCheckedIn?: boolean
}

export function UpcomingFallbackCard({ match, initialCheckedIn = false }: Props) {
  const router = useRouter()
  const kickoff = new Date(match.kickoffUtc)
  const time = kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const date = kickoff.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div
      onClick={() => router.push(`/match/${match.id}`)}
      className="flex rounded-2xl overflow-hidden border border-cream-border opacity-[0.85] cursor-pointer hover:border-ink/20 hover:opacity-100 transition-all"
    >
      <div className="flex-1 bg-cream-surface p-7">
        <p className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-4">
          {match.competition ?? copy.fixtures.fifaWorldCup2026}
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <img src={flagUrl(match.home, 40)} alt={match.home} className="w-7 h-5 rounded-sm object-cover" />
            <span className="font-display text-lg font-bold text-ink-secondary">{match.home}</span>
          </div>
          <span className="text-sm text-ink-ghost">vs</span>
          <div className="flex items-center gap-2">
            <img src={flagUrl(match.away, 40)} alt={match.away} className="w-7 h-5 rounded-sm object-cover" />
            <span className="font-display text-lg font-bold text-ink-secondary">{match.away}</span>
          </div>
        </div>
        <div className="font-display text-[52px] font-bold text-cream-muted leading-none tracking-tight">
          – –
        </div>
        <p className="text-[12px] text-ink-ghost mt-2">{copy.fixtures.kicksOffAt(time)} · {date}</p>
      </div>
      <div className="w-36 flex-shrink-0 bg-cream border-l-2 border-dashed border-cream-muted p-5 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-1">{copy.fixtures.kickoff}</p>
          <p className="font-display text-2xl font-bold text-ink">{time}</p>
          <p className="text-[10px] text-ink-ghost mt-0.5">{date}</p>
        </div>
        <div>
          <div className="text-[11px] text-ink-ghost font-medium mb-2 uppercase tracking-wider">
            {copy.fixtures.notYetLive}
          </div>
          <CheckinButton matchId={match.id} initialCheckedIn={initialCheckedIn} />
        </div>
      </div>
    </div>
  )
}
