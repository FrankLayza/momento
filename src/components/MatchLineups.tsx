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

// Mock formations
const MOCK_AWAY: Player[][] = [
  [{ number: 1, name: 'GK' }],
  [{ number: 2, name: '' }, { number: 4, name: '' }, { number: 5, name: '' }, { number: 3, name: '' }],
  [{ number: 6, name: '' }, { number: 8, name: '' }, { number: 10, name: '' }],
  [{ number: 7, name: '' }, { number: 9, name: '' }, { number: 11, name: '' }],
]

const MOCK_HOME: Player[][] = [
  [{ number: 9, name: '' }],
  [{ number: 7, name: '' }, { number: 10, name: '' }, { number: 11, name: '' }],
  [{ number: 4, name: '' }, { number: 8, name: '' }],
  [{ number: 2, name: '' }, { number: 5, name: '' }, { number: 6, name: '' }, { number: 3, name: '' }],
  [{ number: 1, name: 'GK' }],
]

export function MatchLineups({ matchId, home, away }: Props) {
  return (
    <div className="bg-cream-surface rounded-2xl border border-cream-border p-5">
      <div className="flex gap-4 mb-4 text-[11px] text-ink-ghost font-medium">
        <span>{home} <strong className="text-ink font-display">4-2-3-1</strong></span>
        <span>·</span>
        <span>{away} <strong className="text-ink font-display">4-3-3</strong></span>
      </div>

      <div className="bg-[#C8DDB8] rounded-xl p-4 flex flex-col justify-between gap-4 relative overflow-hidden" style={{ minHeight: 440 }}>
        {/* Pitch markings */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/20 -translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Away Team (Top Half - Spain) */}
        <div className="flex flex-col justify-start gap-4 z-10">
          {MOCK_AWAY.map((row, ri) => (
            <div key={`away-${ri}`} className="flex justify-center gap-1">
              {row.map((p) => (
                <div key={`away-${p.number}`} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-8 h-8 rounded-full bg-live text-cream flex items-center justify-center font-display text-[11px] font-bold border-2 border-white/30 shadow-sm">
                    {p.number}
                  </div>
                  {p.name && <span className="text-[8px] text-[#3A5C2A] font-medium">{p.name}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Home Team (Bottom Half - France) */}
        <div className="flex flex-col justify-end gap-4 z-10">
          {MOCK_HOME.map((row, ri) => (
            <div key={`home-${ri}`} className="flex justify-center gap-1">
              {row.map((p) => (
                <div key={`home-${p.number}`} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-display text-[11px] font-bold border-2 border-white/30 shadow-sm">
                    {p.number}
                  </div>
                  {p.name && <span className="text-[8px] text-[#3A5C2A] font-medium">{p.name}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
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
