'use client'
// Implements FR-1.2
// Formation data — TODO: wire from TxLINE lineups endpoint when confirmed

interface Player {
  number: number
  name: string
}

interface Props {
  matchId: string
  home: string
  away: string
}

// Mock formation — replace with real data
const MOCK_HOME: Player[][] = [
  [{ number: 1, name: 'GK' }],
  [{ number: 2, name: '' }, { number: 5, name: '' }, { number: 6, name: '' }, { number: 3, name: '' }],
  [{ number: 4, name: '' }, { number: 8, name: '' }],
  [{ number: 7, name: '' }, { number: 10, name: '' }, { number: 11, name: '' }],
  [{ number: 9, name: '' }],
]

export function MatchLineups({ matchId, home, away }: Props) {
  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
      <div className="flex gap-4 mb-4 text-[11px] text-ink-ghost font-medium">
        <span>{home} <strong className="text-ink font-display">4-2-3-1</strong></span>
        <span>·</span>
        <span>{away} <strong className="text-ink font-display">4-3-3</strong></span>
      </div>

      <div className="bg-[#C8DDB8] rounded-xl p-4 flex flex-col justify-between gap-5" style={{ minHeight: 320 }}>
        {MOCK_HOME.slice().reverse().map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map((p) => (
              <div key={p.number} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-display text-[11px] font-bold border-2 border-white/30">
                  {p.number}
                </div>
                {p.name && <span className="text-[8px] text-[#3A5C2A] font-medium">{p.name}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-ink" />
          <span className="text-[11px] text-ink-secondary">{home}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-live" />
          <span className="text-[11px] text-ink-secondary">{away}</span>
        </div>
      </div>
    </div>
  )
}
