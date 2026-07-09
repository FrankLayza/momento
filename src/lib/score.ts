/**
 * src/lib/score.ts
 * Implements FR-4.1 (PRD) — shock score formula.
 *
 * PURE FUNCTION: no IO, no side effects, no imports except types.
 * The same inputs MUST always produce the same output (PRD FR-4.1).
 */

import { type Tier, tierFromScore } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ── Input shape ───────────────────────────────────────────────────────────────

export interface ShockScoreInput {
  /** Implied probability of the relevant outcome immediately before the event (0..1) */
  pBefore: number;
  /** Implied probability of the relevant outcome immediately after the event (0..1) */
  pAfter: number;
  /**
   * Pre-match implied probability of the eventual full-time outcome (0..1).
   * Only used for T4 (full-time upset) override.
   */
  pPreMatch: number;
  /** Match minute at which the event occurred */
  minute: number;
  /** Which trigger fired (T1–T4) */
  trigger: "T1" | "T2" | "T3" | "T4";
}

// ── Output shape ──────────────────────────────────────────────────────────────

export interface ShockScoreResult {
  shockScore: number;  // integer 0..100
  tier: Tier;
}

// ── Formula (Implementation Guide §7) ────────────────────────────────────────

/**
 * Computes the shock score and tier for a Moment.
 * Implements FR-4.1 (PRD): deterministic, no human/AI judgement.
 *
 * Formula:
 *   swing    = abs(pAfter - pBefore)                          // 0..1
 *   surprise = 1 - pBefore                                    // unlikely events score higher
 *   lateness = clamp((minute - 60) / 30, 0, 1)               // 0 before 60', 1 at 90'+
 *   base     = 55 * swing + 30 * surprise + 15 * lateness     // 0..100
 *
 *   T4 override (full-time upset): base = 100 * (1 - pPreMatch), floor 65
 *
 *   shockScore = round(clamp(base, 0, 100))
 */
export function computeShockScore(input: ShockScoreInput): ShockScoreResult {
  const { pBefore, pAfter, pPreMatch, minute, trigger } = input;

  let base: number;

  if (trigger === "T4") {
    // T4 override: full-time upset — base = 100 * (1 - pPreMatch), floor 65
    base = 100 * (1 - pPreMatch);
    base = Math.max(base, 65);
  } else {
    // Standard formula (T1, T2, T3)
    const swing    = Math.abs(pAfter - pBefore);
    const surprise = 1 - pBefore;
    const lateness = clamp((minute - 60) / 30, 0, 1);

    base = 55 * swing + 30 * surprise + 15 * lateness;
  }

  const shockScore = Math.round(clamp(base, 0, 100));
  const tier = tierFromScore(shockScore);

  return { shockScore, tier };
}
