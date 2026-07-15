interface Props {
  /** Optional label shown beneath the animation (e.g. "Loading fixtures") */
  label?: string
  className?: string
}

/**
 * Looping footballer-kicking-a-ball loading indicator.
 * Pure CSS animation (see kick-leg/kick-ball/kick-shadow in tailwind.config.ts)
 * so it stays smooth even while the page is busy fetching/hydrating.
 */
export function KickLoader({ label, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        {/* Ground shadow — shrinks as the ball lifts off, grows as it lands */}
        <ellipse
          cx="46"
          cy="58"
          rx="6"
          ry="2"
          className="fill-ink origin-[46px_58px] animate-kick-shadow motion-reduce:animate-none"
        />

        {/* Standing leg */}
        <path d="M28 34 L22 50" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
        {/* Trailing arm */}
        <path d="M29 22 L37 29" className="stroke-ink" strokeWidth="2.5" strokeLinecap="round" />
        {/* Torso */}
        <path d="M30 19 L28 34" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
        {/* Head */}
        <circle cx="30" cy="14" r="5" className="fill-ink" />

        {/* Kicking leg — rotates about the hip */}
        <g className="origin-[28px_34px] animate-kick-leg motion-reduce:animate-none">
          <path d="M28 34 L40 44" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="44" r="2.5" className="fill-ink" />
        </g>

        {/* Ball — launched by the kick, arcs up, settles back down */}
        <circle
          cx="46"
          cy="54"
          r="4"
          className="fill-cyan origin-[46px_54px] animate-kick-ball motion-reduce:animate-none"
        />
      </svg>

      {label && (
        <p className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase motion-reduce:animate-pulse">
          {label}
        </p>
      )}
    </div>
  )
}
