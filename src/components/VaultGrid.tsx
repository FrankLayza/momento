'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="text-center py-20 px-6 rounded-2xl shadow-sm relative overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none" style={{ backgroundImage: 'radial-gradient(var(--color-fore) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
          <svg className="w-8 h-8 opacity-40 text-fore-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <p className="font-display text-3xl mb-3 tracking-wide" style={{ color: 'var(--color-fore)' }}>YOUR VAULT IS SECURED</p>
        <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--color-fore-2)' }}>
          No moments have been claimed yet. Witness live matches, check in to claim exclusive shock-score collectibles, and lock them in your permanent collection.
        </p>
        <Link
          href="/"
          className="inline-block mt-8 font-display text-[13px] px-8 py-3.5 rounded-full tracking-wider hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-md font-bold"
          style={{ background: 'var(--color-fore)', color: 'var(--color-surface)' }}
        >
          EXPLORE LIVE MATCHES →
        </Link>
      </motion.div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {editions.map((ed) => (
        <MomentCard
          key={ed.id}
          moment={ed.moment}
          matchDetails={ed.matchDetails}
        />
      ))}
      <div
        className="rounded-2xl border-2 border-dashed flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px] transition-colors cursor-pointer group"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-fore-3)' }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--color-surface)'
          e.currentTarget.style.borderColor = 'var(--color-fore-3)'
          e.currentTarget.style.color = 'var(--color-fore-2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = ''
          e.currentTarget.style.borderColor = 'var(--color-border)'
          e.currentTarget.style.color = 'var(--color-fore-3)'
        }}
      >
        <div className="text-4xl mb-2 font-light group-hover:scale-110 transition-transform duration-300">+</div>
        <div className="text-[11px] font-bold tracking-widest uppercase">Witness more</div>
      </div>
    </div>
  )
}
