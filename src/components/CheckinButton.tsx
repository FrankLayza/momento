"use client";

import { useState } from "react";
import { useCheckIn } from "@/hooks/useCheckIn";
import { copy } from "@/lib/copy";

interface Props {
  matchId: string;
  initialCheckedIn?: boolean;
}

export function CheckinButton({ matchId, initialCheckedIn = false }: Props) {
  const { isCheckedIn, loading, checkIn } = useCheckIn(
    matchId,
    initialCheckedIn,
  );
  const [isHovering, setIsHovering] = useState(false);
  const [isKicked, setIsKicked] = useState(false);

  const handleAnimationEnd = () => {
    if (isKicked) {
      setIsKicked(false);
    }
  };

  if (isCheckedIn) {
    return (
      <button
        disabled
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-ink/10 text-ink/40 border border-ink/10 rounded-lg py-3 px-4 text-[13px] font-body font-bold tracking-[0.04em] uppercase cursor-default flex items-center justify-center gap-1.5 min-h-[48px]"
      >
        {copy.checkin.checkedInLabel}
      </button>
    );
  }

  return (
    <>
      <style>{`
        /* 1. Juggling/Hover Boot */
        @keyframes bootJuggle {
          0%, 100% {
            transform: translate3d(-3rem, -1.5rem, 0) rotate(-35deg);
            opacity: 1;
          }
          50% {
            transform: translate3d(-0.5rem, -0.2rem, 0) rotate(-10deg);
            opacity: 1;
          }
        }

        /* 2. Juggling/Hover Ball */
        @keyframes ballJuggle {
          0%, 100% {
            transform: translate3d(-2.5rem, -50%, 0) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translate3d(-2rem, -70%, 0) rotate(45deg);
            opacity: 1;
          }
        }

        /* 3. Strike Boot */
        @keyframes bootStrike {
          0% {
            transform: translate3d(-0.5rem, -0.2rem, 0) rotate(-10deg);
            opacity: 1;
          }
          20% {
            transform: translate3d(0.5rem, -0.5rem, 0) rotate(5deg);
            opacity: 1;
          }
          70% {
            opacity: 0;
          }
          100% {
            transform: translate3d(-3rem, -2rem, 0) rotate(-45deg);
            opacity: 0;
          }
        }

        /* 4. Strike Ball */
        @keyframes pitchKick {
          0% {
            transform: translate3d(-2rem, -70%, 0) rotate(45deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(calc(100cqw + 2.5rem), -50%, 0) rotate(480deg);
            opacity: 0;
          }
        }

        .animate-boot-juggle {
          animation: bootJuggle 0.6s infinite ease-in-out;
        }

        .animate-ball-juggle {
          animation: ballJuggle 0.6s infinite ease-in-out;
        }

        .animate-boot-strike {
          animation: bootStrike 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-ball-strike {
          animation: pitchKick 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}</style>

      <button
        onMouseEnter={() => !isKicked && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (!loading && !isKicked) {
            setIsKicked(true);
            void checkIn();
          }
        }}
        disabled={loading}
        className={`group @container relative w-full rounded-lg py-3 px-4 text-[13px] font-body font-bold tracking-[0.04em] uppercase transition-all duration-300 cursor-pointer overflow-hidden active:scale-[0.98] select-none disabled:opacity-50 flex items-center justify-center min-h-[48px]
          ${isKicked || loading
            ? "bg-accent text-fore shadow-[0_0_20px_rgba(0,200,83,0.4)]"
            : isHovering
              ? "bg-blue text-white shadow-[0_0_20px_rgba(26,86,219,0.4)]"
              : "bg-ink text-cream"
          }`}
      >
        {/* GREEN GRASS BOTTOM */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[60%] bg-linear-to-t from-[#1b4332] to-[#2d6a4f] pointer-events-none transition-transform duration-300 origin-bottom ${isHovering || isKicked ? "scale-y-100" : "scale-y-0"}`}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 h-[60%] bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_50%,transparent_50%)] bg-size-[16px_100%] pointer-events-none transition-transform duration-300 origin-bottom ${isHovering || isKicked ? "scale-y-100" : "scale-y-0"}`}
        />

        {/* LAYER 1: THE FOOTBALL BOOT */}
        <div
          className={`absolute top-1/2 left-0 w-8 h-8 pointer-events-none z-30 transition-opacity duration-200 ${
            isKicked
              ? "animate-boot-strike opacity-100"
              : isHovering
                ? "animate-boot-juggle opacity-100"
                : "opacity-0"
          }`}
          style={{ transformOrigin: "top left" }}
        >
          {/* Detailed Soccer Cleat/Boot Vector */}
          <svg
            viewBox="0 0 512 512"
            className="w-full h-full fill-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M495.9 339.8c-10.4-17.7-33-31.4-60.7-31.4-12.7 0-25.1 2.9-36.2 8.2L282.6 195.1c11.9-20.7 15.6-43.1 8-63.4l-21.7-57.8c-3.1-8.3-11.1-13.9-20-13.9h-61.2c-8.4 0-16.1 4.9-19.6 12.5L121 174.1c-15.6 4.9-30.8 14-43.6 26.8C43.2 235.1 32 284.1 32 328c0 14.1 3.4 28.1 10.1 40.5l11.4 21.2c4 7.4 11.7 12.3 20.2 12.3h291.7c7 0 13.8-3.3 18.1-9l108.3-143.4c6.3-8.3 4.4-20.2-3.9-29.8zM288 368h-32v16c0 8.8-7.2 16-16 16s-16-7.2-16-16v-16h-48v16c0 8.8-7.2 16-16 16s-16-7.2-16-16v-16H84.4l-4.3-8c-3.8-7-5.1-14.7-4-22.3L128 352v-32l-44.6 9.3c-2.3-11.5-1.1-23 3.8-33.3L144 288v-32l-41.9 16.8c6.1-11.4 15.3-20.7 26.6-26.6L192 224v-32l-51.2 34.1c18.5-22.2 47.1-34.1 76.5-34.1h26.2l12.8 34.1c5.4 14.3 2.1 30.7-8.3 41.7l-44.3 46.9c-6.2 6.6-6.2 17 0 23.6l16.4 17.4c6.6 7 17.5 7.4 24.6.9l80-73.8c11.5-10.6 28.9-11.3 41.1-1.7l46.2 36.3c3.3 2.6 5.3 6.6 5.3 10.8v41.4l-31.5 35.5c-4.3 4.9-10.5 7.7-17 7.7z" />
          </svg>
        </div>

        {/* LAYER 2: THE SOCCER BALL */}
        <div
          onAnimationEnd={handleAnimationEnd}
          className={`absolute top-1/2 left-0 w-6 h-6 pointer-events-none z-20 transition-opacity duration-200 ${
            isKicked
              ? "animate-ball-strike opacity-100"
              : isHovering
                ? "animate-ball-juggle opacity-100"
                : "opacity-0"
          }`}
        >
          <svg
            viewBox="0 0 512 512"
            className="w-full h-full fill-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M256,0C114.615,0,0,114.615,0,256s114.615,256,256,256s256-114.615,256-256S397.385,0,256,0z M256,470 c-17.701,0-34.786-2.316-51.104-6.643l19.516-57.81h63.177l19.516,57.81C290.786,467.684,273.701,470,256,470z M125.753,428.176 c-15.035-9.431-28.384-21.233-39.635-34.992l44.385-42.502l41.656,21.562l-13.385,46.126L125.753,428.176z M44.664,307.104 c-5.69-16.142-8.73-33.438-8.73-51.104c0-14.78,2.128-29.071,6.079-42.616l53.943,18.995v46.994l-51.272,27.752 C44.671,307.117,44.666,307.111,44.664,307.104z M66.527,151.782l47.165,34.02l41.139-22.535l14.184-45.885l-33.567-46.069 C107.567,90.41,84.974,118.892,66.527,151.782z M176.494,42.518c24.582-6.866,50.485-10.518,79.506-10.518 c29.022,0,54.924,3.652,79.507,10.518l-23.753,55.945h-111.51L176.494,42.518z M376.622,71.312l-33.567,46.069l14.184,45.885 l41.139,22.535l47.165-34.02C427.026,118.892,404.433,90.41,376.622,71.312z M467.336,213.384 c3.951,13.545,6.079,27.836,6.079,42.616c0,17.666-3.041,34.962-8.73,51.104c-0.002,0.007-0.007,0.013-0.02,0.021l-51.272-27.752 v-46.994L467.336,213.384z M386.247,428.176l-33.021-9.248l-13.385-46.126l41.656-21.562l44.385,42.502 C414.631,406.943,401.282,418.745,386.247,428.176z M256,134.402l61.277,44.521l-23.405,72.031h-75.744l-23.405-72.031 L256,134.402z M157.067,287.424l35.293-41.972l42.428,24.53v55.513l-45.72,30.312l-51.205-26.518L157.067,287.424z M319.64,245.452l35.293,41.972l19.205,41.839l-51.205,26.518l-45.72-30.312v-55.513L319.64,245.452z" />
          </svg>
        </div>

        {/* LAYER 3: TEXT CONTENT / SPINNER */}
        <span className="relative z-10 flex items-center justify-center gap-1.5 transition-transform duration-200 group-hover:scale-105 group-hover:-translate-y-1">
          {loading ? (
            <svg
              className="animate-spin h-3.5 w-3.5 text-cream"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            copy.checkin.action
          )}
        </span>
      </button>
    </>
  );
}
