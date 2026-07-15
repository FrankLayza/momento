'use client'
import Link from 'next/link'
import type { Moment } from '@/lib/types'
import { MomentCard } from './MomentCard'

interface Edition {
  id: string
  moment: Moment
  matchDetails?: { home: string, away: string }
}

export function VaultGrid({ editions }: { editions: Edition[] }) {
  if (editions.length === 0) {
    return (
      <div className="text-center py-24 px-4 bg-cream-surface rounded-2xl border border-cream-border shadow-sm">
        <p className="font-display text-2xl font-bold text-ink mb-3">Nothing here yet.</p>
        <p className="text-[15px] text-ink-secondary max-w-sm mx-auto leading-relaxed">
          Check in to a live match to start witnessing Moments and building your collection.
        </p>
        <Link href="/" className="inline-block mt-8 bg-ink text-cream font-display text-[14px] font-bold px-8 py-3.5 rounded-full tracking-wide hover:bg-ink/90 hover:scale-105 transition-all shadow-md">
          See today's matches →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {editions.map((ed) => (
        <MomentCard 
          key={ed.id} 
          moment={ed.moment} 
          matchDetails={ed.matchDetails}
        />
      ))}
      <div className="rounded-2xl border-2 border-dashed border-cream-border flex flex-col items-center justify-center min-h-[300px] text-cream-muted hover:text-ink-secondary hover:border-ink/20 hover:bg-cream-surface transition-colors cursor-pointer group">
        <div className="text-4xl mb-2 font-light group-hover:scale-110 transition-transform duration-300">+</div>
        <div className="text-[11px] font-semibold tracking-widest uppercase">Witness more</div>
      </div>
    </div>
  )
}
