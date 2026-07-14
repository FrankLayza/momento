'use client'
import Link from 'next/link'

const TIER_STYLES: Record<string, { card: string; badge: string; badgeText: string }> = {
  Seismic: { card: '#FDE8E8', badge: '#FDE5E5', badgeText: '#8B1F1F' },
  Shock:   { card: '#FBF4E4', badge: '#FDF0D5', badgeText: '#7A4800' },
  Notable: { card: '#E4F6F7', badge: '#D9F5F6', badgeText: '#006E78' },
  Common:  { card: '#EDE8DC', badge: '#E8E3D9', badgeText: '#6B6459' },
}

interface Edition {
  id: string
  moments: {
    id: string
    tier: string
    score_home: number
    score_away: number
    minute: number
    match_id: string
  }
}

export function VaultGrid({ editions }: { editions: Edition[] }) {
  if (editions.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-xl font-bold text-ink mb-2">Nothing here yet.</p>
        <p className="text-[14px] text-ink-ghost">Check in to a live match to start witnessing.</p>
        <Link href="/" className="inline-block mt-6 bg-ink text-cream font-display text-[13px] font-bold px-6 py-3 rounded-xl tracking-wide hover:bg-ink/90 transition-colors">
          See today's matches →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {editions.map((ed) => {
        const m = ed.moments
        const styles = TIER_STYLES[m.tier] ?? TIER_STYLES.Common
        return (
          <Link key={ed.id} href={`/m/${m.id}`}>
            <div className="rounded-xl overflow-hidden border border-cream-border hover:scale-[1.02] transition-transform cursor-pointer" style={{ background: styles.card }}>
              <div className="p-3 flex flex-col gap-2 min-h-[80px] justify-between">
                <span className="self-start text-[8px] font-semibold tracking-[0.14em] uppercase px-1.5 py-0.5 rounded" style={{ background: styles.badge, color: styles.badgeText }}>
                  {m.tier}
                </span>
                <div className="font-display text-[22px] font-bold leading-none tracking-tight text-ink">
                  {m.score_home}–{m.score_away}
                </div>
              </div>
              <div className="bg-ink px-3 py-2">
                <p className="font-display text-[10px] font-bold text-cream tracking-wide">{m.match_id}</p>
                <p className="text-[8px] text-ink-ghost uppercase tracking-[0.08em] mt-0.5">{m.minute}' · Sealed</p>
              </div>
            </div>
          </Link>
        )
      })}
      <div className="rounded-xl border-2 border-dashed border-cream-border flex items-center justify-center min-h-[120px]">
        <div className="text-center">
          <div className="text-xl text-cream-muted mb-1">+</div>
          <div className="text-[10px] text-ink-ghost">Witness more</div>
        </div>
      </div>
    </div>
  )
}
