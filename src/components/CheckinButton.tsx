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
      <div className="flex justify-center">
        <button
          disabled
          className="px-6 py-2.5 rounded-full bg-cream-surface border border-tier-notable/35 text-tier-notable text-xs font-bold tracking-wider uppercase cursor-default shadow-sm"
        >
          ✓ {copy.checkin.checkedIn}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        id="checkin-button"
        onClick={() => { void checkIn() }}
        disabled={loading}
        className="px-8 py-2.5 rounded-full bg-tier-notable text-ink hover:bg-tier-notable/90 text-xs font-bold tracking-wider uppercase transition-colors duration-150 disabled:opacity-50 shadow-sm cursor-pointer"
      >
        {loading ? "Checking in..." : copy.checkin.action}
      </button>
    </div>
  )
}
