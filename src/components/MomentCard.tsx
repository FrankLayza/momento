/**
 * src/components/MomentCard.tsx
 * Trading-card aspect ratio Moment display.
 * Implements FR-4.2, FR-4.3 (PRD) — tier visual treatment + probability line.
 *
 * Design reference: nbatopshot.com, courtyard.io
 * — card grid rhythm, tier visual escalation (Implementation Guide §12).
 *
 * Card proportions: 2.5:3.5 (standard trading card).
 * Foil/sheen applied to Shock and Seismic tiers only.
 */

import Link from "next/link";
import type { Moment } from "@/lib/types";
import { copy } from "@/lib/copy";
import { TierBadge } from "./TierBadge";

interface Props {
  moment: Moment;
  /** If true, renders as a larger centred display card */
  featured?: boolean;
}

const TIER_ACCENT_CLASS: Record<string, string> = {
  Common:  "border-tier-common/30",
  Notable: "border-tier-notable/40",
  Shock:   "border-tier-shock/50",
  Seismic: "border-tier-seismic/60",
};

const SCORE_COLOR: Record<string, string> = {
  Common:  "text-tier-common",
  Notable: "text-tier-notable",
  Shock:   "text-tier-shock",
  Seismic: "text-tier-seismic",
};

export function MomentCard({ moment, featured = false }: Props) {
  const accentBorder = TIER_ACCENT_CLASS[moment.tier] ?? "";
  const scoreColor   = SCORE_COLOR[moment.tier] ?? "text-ink";
  const hasFoil      = moment.tier === "Shock" || moment.tier === "Seismic";
  const pct          = Math.round((1 - moment.pBefore.home) * 100);

  const eventLabel =
    moment.trigger === "T1" ? `Goal · ${moment.minute}'`
    : moment.trigger === "T2" ? `Red card · ${moment.minute}'`
    : moment.trigger === "T3" ? `Probability shift · ${moment.minute}'`
    : "Full-time upset";

  return (
    <Link
      href={`/m/${moment.id}`}
      className={`
        relative flex flex-col rounded-2xl overflow-hidden border border-cream-border
        bg-cream-surface transition-transform hover:-translate-y-0.5 shadow-sm
        ${accentBorder}
        ${hasFoil ? "foil-sheen" : ""}
        ${featured ? "w-full" : "aspect-card"}
      `}
    >
      {/* Top section: tier badge + event */}
      <div className="flex items-start justify-between p-3 pb-0">
        <TierBadge tier={moment.tier} size="sm" />
        <span className="text-[10px] text-ink-secondary font-semibold">{eventLabel}</span>
      </div>

      {/* Score — the hero number */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-4">
        <div className={`font-display text-5xl font-extrabold leading-none ${scoreColor}`}>
          {moment.shockScore}
        </div>
        <div className="text-[10px] text-ink-secondary mt-1 uppercase tracking-widest">
          {copy.moment.shockRating}
        </div>
      </div>

      {/* Bottom: probability + witness count */}
      <div className="px-3 pb-3 space-y-1">
        <p className="text-[10px] text-ink-secondary leading-snug">
          {copy.moment.marketChance(pct)}
        </p>
        <p className="text-[10px] text-ink-secondary">
          {copy.moment.witnessCount(moment.witnessCount)}
        </p>
      </div>

      {/* Seismic: gradient overlay accent at bottom */}
      {moment.tier === "Seismic" && (
        <div
          className="absolute inset-x-0 bottom-0 h-1 bg-seismic-gradient"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
