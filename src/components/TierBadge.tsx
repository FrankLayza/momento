/**
 * src/components/TierBadge.tsx
 * Visual tier badge — Common / Notable / Shock / Seismic.
 * Implements FR-4.2 (PRD).
 */

import type { Tier } from "@/lib/types";
import { copy } from "@/lib/copy";

const TIER_STYLES: Record<Tier, string> = {
  Common:  "bg-tier-common/10  text-tier-common  border-tier-common/30",
  Notable: "bg-tier-notable/10 text-tier-notable border-tier-notable/40",
  Shock:   "bg-tier-shock/10   text-tier-shock   border-tier-shock/50",
  Seismic: "bg-tier-seismic/10 text-tier-seismic border-tier-seismic/60",
};

interface Props {
  tier: Tier;
  size?: "sm" | "md";
}

export function TierBadge({ tier, size = "md" }: Props) {
  const style = TIER_STYLES[tier];

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-widest ${style} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      {copy.tiers[tier]}
    </span>
  );
}
