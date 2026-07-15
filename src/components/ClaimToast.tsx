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
import { TierBadge } from "./TierBadge";

interface Props {
  moment:   Moment;
  onClaim:  () => void;
  onDismiss: () => void;
}

export function ClaimToast({ moment, onClaim, onDismiss }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDismiss]);

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
      className="claim-toast animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-start gap-3">
        {/* Tier badge */}
        <div className="shrink-0 mt-0.5">
          <TierBadge tier={moment.tier} size="sm" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-snug">
            A Moment just happened.
          </p>
          <p className="text-xs text-ink-secondary mt-0.5">
            {eventLabel} · {copy.moment.marketChance(pct)}
          </p>
          <p className="text-xs text-ink-secondary mt-0.5">
            {copy.moment.witnessCount(moment.witnessCount)}
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-ink-secondary hover:text-ink transition-colors text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Claim button */}
      <button
        id="claim-toast-button"
        onClick={() => { void handleClaim(); }}
        disabled={claiming}
        className="mt-3 w-full rounded-full bg-ink text-cream text-sm font-bold py-2.5 hover:bg-ink/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {claiming ? copy.claim.pending : `${copy.claim.action} (${timeLeft}s)`}
      </button>

      {/* Visual countdown progress bar */}
      <div className="mt-3 w-full bg-cream-muted/30 h-1 rounded-full overflow-hidden">
        <div
          className="bg-ink h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 60) * 100}%` }}
        />
      </div>
    </div>
  );
}
