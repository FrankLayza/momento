interface Props {
  /** Optional label shown beneath the animation (e.g. "Loading fixtures") */
  label?: string
  className?: string
}

/**
 * Premium editorial loading indicator.
 * Features a sleek dual-ring spinner and clean typography.
 */
export function KickLoader({ label, className = '' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 py-16 ${className}`}>
      <div className="relative flex items-center justify-center w-14 h-14">
        {/* Outer fast ring */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        {/* Inner slow ring */}
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue animate-spin" style={{ animationDuration: '2s' }} />
        {/* Center dot */}
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-fore-3)' }} />
      </div>

      {label && (
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase animate-pulse" style={{ color: 'var(--color-fore-3)' }}>
          {label}
        </p>
      )}
    </div>
  )
}
