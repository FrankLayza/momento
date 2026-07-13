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
        @keyframes trackedKick {
          0% {
            /* Starts safely tucked away on the left */
            transform: translate3d(-2.5rem, -50%, 0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            /* Dynamically clears the button width plus its own size */
            transform: translate3d(calc(100cqw + 2.5rem), -50%, 0) rotate(540deg);
            opacity: 0;
          }
        }
        .animate-kick {
          /* Increased duration to 0.75s.
            Using a cubic-bezier(0.25, 1, 0.5, 1) to give it a fast start,
            but enough brake control through the middle so the eye can follow the ball.
          */
          animation: trackedKick 0.75s cubic-bezier(0.25, 1, 0.5, 1) forwards;
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
        {/* Upsized Soccer Ball Asset */}
        <div
          onAnimationEnd={handleAnimationEnd}
          className={`absolute top-1/2 left-0 w-7 h-7 pointer-events-none opacity-0 z-20 ${
            isKicked ? 'animate-kick' : ''
          }`}
        >
          <svg 
            viewBox="0 0 512 512" 
            className="w-full h-full fill-cream" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Boundary Ring */}
            <path d="M256,0C114.615,0,0,114.615,0,256s114.615,256,256,256s256-114.615,256-256S397.385,0,256,0z M256,470 c-17.701,0-34.786-2.316-51.104-6.643l19.516-57.81h63.177l19.516,57.81C290.786,467.684,273.701,470,256,470z M125.753,428.176 c-15.035-9.431-28.384-21.233-39.635-34.992l44.385-42.502l41.656,21.562l-13.385,46.126L125.753,428.176z M44.664,307.104 c-5.69-16.142-8.73-33.438-8.73-51.104c0-14.78,2.128-29.071,6.079-42.616l53.943,18.995v46.994l-51.272,27.752 C44.671,307.117,44.666,307.111,44.664,307.104z M66.527,151.782l47.165,34.02l41.139-22.535l14.184-45.885l-33.567-46.069 C107.567,90.41,84.974,118.892,66.527,151.782z M176.494,42.518c24.582-6.866,50.485-10.518,79.506-10.518 c29.022,0,54.924,3.652,79.507,10.518l-23.753,55.945h-111.51L176.494,42.518z M376.622,71.312l-33.567,46.069l14.184,45.885 l41.139,22.535l47.165-34.02C427.026,118.892,404.433,90.41,376.622,71.312z M467.336,213.384 c3.951,13.545,6.079,27.836,6.079,42.616c0,17.666-3.041,34.962-8.73,51.104c-0.002,0.007-0.007,0.013-0.02,0.021l-51.272-27.752 v-46.994L467.336,213.384z M386.247,428.176l-33.021-9.248l-13.385-46.126l41.656-21.562l44.385,42.502 C414.631,406.943,401.282,418.745,386.247,428.176z M256,134.402l61.277,44.521l-23.405,72.031h-75.744l-23.405-72.031 L256,134.402z M157.067,287.424l35.293-41.972l42.428,24.53v55.513l-45.72,30.312l-51.205-26.518L157.067,287.424z M319.64,245.452l35.293,41.972l19.205,41.839l-51.205,26.518l-45.72-30.312v-55.513L319.64,245.452z" />
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
