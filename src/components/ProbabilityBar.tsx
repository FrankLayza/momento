/**
 * src/components/ProbabilityBar.tsx
 * Live win-probability bar — Home / Draw / Away.
 * Implements FR-1.2 (PRD).
 *
 * Displays implied probabilities as animated horizontal bars.
 * References: polymarket.com — "market believes" framing (Implementation Guide §12).
 */

interface Props {
  home:  string;
  away:  string;
  pHome: number;  // 0..1
  pDraw: number;  // 0..1
  pAway: number;  // 0..1
}

export function ProbabilityBar({ home, away, pHome, pDraw, pAway }: Props) {
  const fmtPct = (p: number) => `${Math.round(p * 100)}%`;

  return (
    <div className="rounded-xl border border-cream-border bg-cream-surface p-4 shadow-sm">
      {/* Label */}
      <p className="text-xs text-ink-secondary mb-3 uppercase tracking-widest font-semibold">
        Market believes
      </p>

      {/* Segmented bar — cyan is the app's one accent (home), everything
          else stays neutral so it never reads as a tier-rarity color */}
      <div className="flex h-2 w-full rounded-full overflow-hidden gap-0.5 mb-3">
        <div
          className="bg-tier-notable transition-all duration-700 ease-out rounded-l-full"
          style={{ width: fmtPct(pHome) }}
          title={`${home}: ${fmtPct(pHome)}`}
        />
        <div
          className="bg-cream-border transition-all duration-700 ease-out"
          style={{ width: fmtPct(pDraw) }}
          title={`Draw: ${fmtPct(pDraw)}`}
        />
        <div
          className="bg-cream-muted transition-all duration-700 ease-out rounded-r-full"
          style={{ width: fmtPct(pAway) }}
          title={`${away}: ${fmtPct(pAway)}`}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs">
        <div className="text-left">
          <div className="font-semibold text-ink font-display">{fmtPct(pHome)}</div>
          <div className="text-ink-secondary">{home}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-ink-secondary font-display">{fmtPct(pDraw)}</div>
          <div className="text-ink-secondary">Draw</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-ink font-display">{fmtPct(pAway)}</div>
          <div className="text-ink-secondary">{away}</div>
        </div>
      </div>
    </div>
  );
}
