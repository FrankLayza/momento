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

// ── Match timeline event (for the Match page Timeline tab) ────────────────────
// Derived entirely from TxLINE's scores feed (goals from Score deltas, cards
// from Stats deltas). TxLINE carries no player names, so this has none — the
// Timeline UI renders team + event + minute + running score instead.

export interface TimelineEvent {
  minute: number;
  kind: "goal" | "yellow_card" | "red_card" | "substitution" | "penalty" | "var";
  /** null for neutral events (VAR review) with no attributed side */
  team: "home" | "away" | null;
  /** Running scoreline immediately after this event */
  scoreHome: number;
  scoreAway: number;
}

// ── Match stats (for the Match page Stats tab) ────────────────────────────────
// Counted from TxLINE's scores feed: cumulative counters from the Stats block
// (corners, cards) and deduped action rows (shots, free kicks, throw-ins,
// penalties, offsides). Possession is a share of possession-phase events.

export interface TeamStats {
  possession: number;   // percentage 0..100
  shots: number;
  corners: number;
  freeKicks: number;
  throwIns: number;
  offsides: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
}

export interface MatchStats {
  home: TeamStats;
  away: TeamStats;
  momentum: Array<{ minute: number; value: number }>;
}

// ── Match lineups (for the Match page Lineups tab) ────────────────────────────
// Parsed from TxLINE's `lineups` action record. Availability depends on the
// fixture's coverage level (CoverageType "TV/Stream" carries it) — not every
// match has one, so callers must handle null.

export interface LineupPlayer {
  number: number;
  name: string;                       // display name, "First Last"
  position: "G" | "D" | "M" | "F" | null;
  starter: boolean;
}

export interface TeamLineup {
  teamName: string;
  formation: string | null;           // derived from starter position counts, e.g. "4-3-3"
  startXI: LineupPlayer[];
  bench: LineupPlayer[];
}

export interface MatchLineups {
  home: TeamLineup;
  away: TeamLineup;
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
