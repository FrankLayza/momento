'use client'
import { useState } from 'react'

type Tab = 'moments' | 'tier'

const TIER_BADGE: Record<string, string> = {
  Seismic: 'bg-red-50 text-red-700',
  Shock: 'bg-amber-50 text-amber-700',
  Notable: 'bg-cyan/10 text-cyan',
  Common: 'bg-cream-muted/40 text-ink-ghost',
}

interface Entry {
  user_id: string
  display_name: string
  moment_count: number
  top_tier: string
}

interface Props {
  byMoments: Entry[]
  byTier: Entry[]
  currentUserId: string | null
}

export function LeaderboardClient({ byMoments, byTier, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>('moments')
  const entries = tab === 'moments' ? byMoments : byTier
  const currentUserEntry = entries.find(e => e.user_id === currentUserId)
  const currentUserRank = entries.findIndex(e => e.user_id === currentUserId) + 1

  return (
    <div>
      {/* Pill toggle */}
      <div className="flex bg-cream-surface border border-cream-border rounded-full p-1 w-fit mb-6">
        {(['moments', 'tier'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              tab === t ? 'bg-ink text-cream' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {t === 'moments' ? 'Most Moments' : 'Highest Tier'}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 px-6 bg-cream-surface rounded-2xl border border-cream-border">
          <div className="w-12 h-12 rounded-full bg-cream-muted/50 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B9187" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
              <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-ink mb-2">No witnesses yet</h3>
          <p className="text-[13px] text-ink-ghost leading-relaxed">
            Check back once matches begin and fans start claiming Moments.
          </p>
        </div>
      ) : (
        <div className="bg-cream-surface rounded-2xl border border-cream-border overflow-hidden">
          <div className="px-5 py-1">
            {entries.slice(0, 20).map((entry, i) => {
              const isYou = entry.user_id === currentUserId
              const initials = entry.display_name.slice(0, 2).toUpperCase()
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-3 py-3 border-b border-cream-border last:border-none ${isYou ? 'bg-cream-surface/80' : ''}`}
                >
                  <span className={`font-display text-[13px] font-bold w-5 flex-shrink-0 ${i < 3 ? 'text-ink' : 'text-ink-ghost'}`}>
                    {i + 1}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-[11px] font-bold flex-shrink-0 ${isYou ? 'bg-ink text-cream' : 'bg-cream-muted text-ink-secondary'}`}>
                    {initials}
                  </div>
                  <span className="flex-1 text-[14px] font-medium text-ink">
                    {entry.display_name}
                    {isYou && <span className="text-ink-ghost text-[11px] font-normal ml-1">(you)</span>}
                  </span>
                  {tab === 'moments' ? (
                    <span className="font-display text-[14px] font-bold text-ink">{entry.moment_count}</span>
                  ) : (
                    <span className={`text-[9px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded ${TIER_BADGE[entry.top_tier] ?? ''}`}>
                      {entry.top_tier}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pinned current user if outside top 20 */}
          {currentUserEntry && currentUserRank > 20 && (
            <div className="border-t border-cream-border px-5 py-3 bg-cream">
              <div className="flex items-center gap-3">
                <span className="font-display text-[13px] font-bold text-ink-ghost w-5">{currentUserRank}</span>
                <div className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-display text-[11px] font-bold">
                  {currentUserEntry.display_name.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-[14px] font-medium text-ink">
                  {currentUserEntry.display_name} <span className="text-ink-ghost text-[11px] font-normal">(you)</span>
                </span>
                {tab === 'moments' ? (
                  <span className="font-display text-[14px] font-bold text-ink">{currentUserEntry.moment_count}</span>
                ) : (
                  <span className={`text-[9px] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 rounded ${TIER_BADGE[currentUserEntry.top_tier] ?? ''}`}>
                    {currentUserEntry.top_tier}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
