'use client'

import { useState } from 'react'
import { useCheckIn } from '@/hooks/useCheckIn'
import { copy } from '@/lib/copy'

interface Props {
  matchId: string;
  initialCheckedIn?: boolean;
}

export function CheckinButton({ matchId, initialCheckedIn = false }: Props) {
  const { isCheckedIn, loading, checkIn } = useCheckIn(matchId, initialCheckedIn)
  const [isKicked, setIsKicked] = useState(false)

  const handleHover = () => {
    // Only trigger if not already animating and the button is active
    if (!isKicked && !isCheckedIn && !loading) {
      setIsKicked(true)
    }
  }

  const handleAnimationEnd = () => {
    setIsKicked(false)
  }

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
    <>
      {/* Injecting explosive custom keyframes smoothly without needing to touch tailwind.config.js */}
      <style>{`
        @keyframes explosiveKick {
          0% {
            transform: translate3d(-2rem, -50%, 0) rotate(0deg);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            /* Translates completely across its own parent containers width plus padding */
            transform: translate3d(calc(100cqw + 2rem), -50%, 0) rotate(1080deg);
            opacity: 0;
          }
        }
        .animate-kick {
          /* cubic-bezier(0.1, 1, 0.1, 1) provides maximum instantaneous initial velocity */
          animation: explosiveKick 0.45s cubic-bezier(0.1, 1, 0.1, 1) forwards;
        }
      `}</style>

      <button
        onMouseEnter={handleHover}
        onClick={(e) => {
          e.stopPropagation()
          handleHover()
          void checkIn()
        }}
        disabled={loading}
        className="@container relative w-full bg-ink text-cream rounded-lg py-2.5 text-[11px] font-display font-bold tracking-[0.06em] uppercase hover:bg-ink/90 cursor-pointer overflow-hidden active:scale-[0.98] transition-all duration-75 select-none disabled:opacity-50"
      >
        {/* Hidden Masked Soccer Ball */}
        <div
          onAnimationEnd={handleAnimationEnd}
          className={`absolute top-1/2 left-0 w-5 h-5 pointer-events-none opacity-0 z-20 ${
            isKicked ? 'animate-kick' : ''
          }`}
        >
          <svg viewBox="0 0 512 512" className="w-full h-full fill-cream" xmlns="http://www.w3.org/2000/svg">
            <path d="M256 0a256 256 0 1 0 0 512 256 256 0 0 0 0-512zm0 46c19 0 38 3 56 9l-22 66H178l-22-66c18-6 37-9 56-9zm-97 19c-17 10-33 23-46 38l41 55 49-16 12-46-56-31zm194 0l-56 31 12 46 49 16 41-55c-13-15-29-28-46-38zM61 149c-9 16-16 34-20 53l63 26 21-48-41-55zm344 0l-41 55 21 48 63-26c-4-19-11-37-20-53zM137 256l33 46 51-11 11-51-41-41-54 57zm125-56l41 41 11 51 51 11 33-46-54-57-82 0zm-152 4l-57 24c-2 17-2 34 0 51l57 24 16-50-16-49zm292 0l-16 49 16 50 57-24c2-17 2-34 0-51l-57-24zm-225 90l22 66c34 11 70 11 104 0l22-66H177z" />
          </svg>
        </div>

        {/* Text Layer */}
        <span className="relative z-10">
          {loading ? "Checking in..." : copy.checkin.action}
        </span>
      </button>
    </>
  )
}
