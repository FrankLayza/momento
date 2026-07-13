'use client'

import { useCheckIn } from '@/hooks/useCheckIn'
import { copy } from '@/lib/copy'

interface Props {
  matchId: string;
  initialCheckedIn?: boolean;
}

export function CheckinButton({ matchId, initialCheckedIn = false }: Props) {
  const { isCheckedIn, loading, checkIn } = useCheckIn(matchId, initialCheckedIn)

  if (isCheckedIn) {
    return (
      <button
        disabled
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-ink/40 text-cream rounded-lg py-2.5 text-[11px] font-display font-bold tracking-[0.06em] uppercase cursor-default"
      >
        {copy.checkin.checkedInLabel}
      </button>
    )
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        void checkIn()
      }}
      disabled={loading}
      className="w-full bg-ink text-cream rounded-lg py-2.5 text-[11px] font-display font-bold tracking-[0.06em] uppercase hover:bg-ink/90 transition-colors cursor-pointer disabled:opacity-50"
    >
      {loading ? "Checking in..." : copy.checkin.action}
    </button>
  )
}
