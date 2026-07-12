/**
 * src/server/txline/types.ts
 * Implements §5 (Implementation Guide) — normalised TxLINE types.
 *
 * Every file outside src/server/txline/ imports ONLY from this file.
 * adapter.ts is the ONLY file that speaks to the real TxLINE API.
 */

// ── Normalised match ──────────────────────────────────────────────────────────

export interface NormalisedMatch {
  id: string;               // TxLINE's match identifier, passed through verbatim
  home: string;
  away: string;
  kickoffUtc: string;       // ISO-8601
  status: "scheduled" | "live" | "finished";
  minute: number | null;
  score: { home: number; away: number };
  /**
   * Whatever TxLINE's fixture `Competition` field returns, verbatim — or
   * undefined if absent. Do NOT guess a "Group A · Matchday 2"-style format;
   * TxLINE's real string shape is documented in TXLINE-NOTES.md §5. Callers
   * must fall back to a generic label (e.g. "FIFA World Cup 2026") when this
   * is undefined rather than hardcoding a fake stage/group.
   */
  competition?: string;
}

// ── Normalised odds tick ──────────────────────────────────────────────────────

export interface NormalisedOddsTick {
  matchId: string;
  atUtc: string;            // ISO-8601
  /**
   * Implied probabilities, decimal 0..1, normalised so home + draw + away = 1.
   * Conversion from decimal odds:
   *   rawProb = 1 / decimalOdds
   *   total   = rawPHome + rawPDraw + rawPAway        (strips bookmaker margin)
   *   pHome   = rawPHome / total
   */
  pHome: number;
  pDraw: number;
  pAway: number;
}

// ── Normalised match event ────────────────────────────────────────────────────

export interface NormalisedEvent {
  matchId: string;
  atUtc: string;            // ISO-8601
  minute: number;
  kind: "goal" | "red_card" | "kickoff" | "full_time";
  team: "home" | "away" | null;
}

// ── Callback types used by subscribeMatch ─────────────────────────────────────

export type OddsTickCallback  = (tick: NormalisedOddsTick) => void;
export type MatchEventCallback = (event: NormalisedEvent)   => void;

/** Returned by subscribeMatch; call to stop listening */
export type UnsubscribeFn = () => void;
