/**
 * src/components/ClaimToast.tsx
 * In-app notification when a new Moment is available to claim.
 * Implements FR-5.1 (PRD) — Witnesses notified within 30s of Moment creation.
 *
 * Ticking countdown timer automatically dismisses the popup after 60 seconds
 * of inactivity to drive engagement and show urgency.
 */

"use client";

import { useState, useEffect } from "react";
import { copy } from "@/lib/copy";
import type { Moment } from "@/lib/types";
import { MomentCard } from "./MomentCard";

interface Props {
  moment:   Moment;
  onClaim:  () => void;
  onDismiss: () => void;
}

export function ClaimToast({ moment, onClaim, onDismiss }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onDismiss]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      onClaim();
    } finally {
      setClaiming(false);
    }
  };

  const pct = Math.round((1 - moment.pBefore.home) * 100);

  const eventLabel =
    moment.trigger === "T1" ? "Goal"
    : moment.trigger === "T2" ? "Red card"
    : moment.trigger === "T3" ? "Probability shift"
    : "Full-time upset";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="claim-toast animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-ink/90 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-4 pt-5">
        
        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors text-lg leading-none cursor-pointer z-20"
        >
          ×
        </button>

        <div className="flex gap-4 items-center">
          {/* Miniature Moment Card Preview */}
          <div className="w-[84px] shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <MomentCard moment={moment} />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-[13px] font-bold text-white tracking-wide mb-1 shadow-sm">
              A Moment just happened!
            </p>
            <p className="text-[11px] text-white/70 mb-2 leading-relaxed">
              {eventLabel} · {copy.moment.marketChance(pct)}
            </p>
            
            <button
              id="claim-toast-button"
              onClick={() => { void handleClaim(); }}
              disabled={claiming}
              className="w-full rounded-full bg-cyan text-ink text-[12px] font-bold py-2 px-4 hover:bg-cyan/90 transition-all active:scale-95 shadow-[0_0_15px_rgba(79,209,197,0.4)] disabled:opacity-50 disabled:pointer-events-none"
            >
              {claiming ? copy.claim.pending : `${copy.claim.action} (${timeLeft}s)`}
            </button>
          </div>
        </div>

        {/* Glowing fuse countdown bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]' : 'bg-cyan shadow-[0_0_8px_rgba(79,209,197,1)]'}`}
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
