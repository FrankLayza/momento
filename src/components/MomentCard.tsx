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
  /** Optional match details to display team names (e.g., in the Vault) */
  matchDetails?: { home: string; away: string };
  /** If true, renders as a larger centred display card */
  featured?: boolean;
}

const TIER_BG_CLASS: Record<string, string> = {
  Common:  "bg-[#EDE8DC] border-cream-border",
  Notable: "bg-[#E4F6F7] border-cream-border",
  Shock:   "bg-[#FBF4E4] border-cream-border",
  Seismic: "bg-[#FDE8E8] border-cream-border",
};

const SCORE_COLOR: Record<string, string> = {
  Common:  "text-[#a3a3a3]",
  Notable: "text-[#4fd1c5]",
  Shock:   "text-[#fbbf24]",
  Seismic: "text-[#fb7185]",
};

export function MomentCard({ moment, matchDetails, featured = false }: Props) {
  const bgClass    = TIER_BG_CLASS[moment.tier] ?? TIER_BG_CLASS.Common;
  const scoreColor = SCORE_COLOR[moment.tier] ?? SCORE_COLOR.Common;
  const hasFoil    = moment.tier === "Shock" || moment.tier === "Seismic";
  const pct        = Math.round((1 - moment.pBefore.home) * 100);

  const eventLabel =
    moment.trigger === "T1" ? `Goal · ${moment.minute}'`
    : moment.trigger === "T2" ? `Red card · ${moment.minute}'`
    : moment.trigger === "T3" ? `Probability shift · ${moment.minute}'`
    : "Full-time upset";

  return (
    <Link
      href={`/m/${moment.id}`}
      className={`
        group relative flex flex-col rounded-2xl overflow-hidden border-2
        transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-2xl
        ${bgClass}
        ${hasFoil ? "foil-sheen" : ""}
        ${featured ? "w-full" : "aspect-card"}
      `}
    >
      {/* Inner glass reflection */}
      <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none z-10" />

      {/* Top section: tier badge + event */}
      <div className="flex items-start justify-between p-3 pb-0 relative z-20">
        <TierBadge tier={moment.tier} size="sm" />
        <span className="text-[10px] text-ink-secondary font-semibold">{eventLabel}</span>
      </div>

      {/* Center: Teams (if provided) + Score */}
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-4 relative z-20">
        {matchDetails && (
          <div className="text-[11px] font-medium text-ink-secondary mb-2 uppercase tracking-widest text-center">
            {matchDetails.home} <span className="text-ink-ghost">v</span> {matchDetails.away}
          </div>
        )}
        <div className={`font-display ${featured ? 'text-7xl' : 'text-5xl'} font-extrabold leading-none tracking-tight drop-shadow-md ${scoreColor} transition-transform duration-300 group-hover:scale-110`}>
          {moment.shockScore}
        </div>
        <div className="text-[10px] text-ink-secondary mt-2 uppercase tracking-[0.2em] font-medium">
          {copy.moment.shockRating}
        </div>
      </div>

      {/* Bottom: probability + witness count */}
      <div className="bg-ink text-cream px-3 py-3 mt-auto relative z-20">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[9px] text-cream-muted uppercase tracking-widest mb-0.5">Market Chance</p>
            <p className="text-[11px] text-cream font-semibold leading-snug">
              {pct}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-cream-muted uppercase tracking-widest mb-0.5">Witnesses</p>
            <p className="text-[11px] text-cream font-semibold">
              {moment.witnessCount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Seismic: gradient overlay accent at bottom */}
      {moment.tier === "Seismic" && (
        <div
          className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-transparent via-[#fb7185] to-transparent opacity-50 blur-[2px]"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
