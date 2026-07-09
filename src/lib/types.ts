/**
 * src/lib/types.ts
 * Shared application types for Momento.
 * All files import domain types from here — not from each other.
 */

// ── Tiers (PRD FR-4.2) ───────────────────────────────────────────────────────

export type Tier = "Common" | "Notable" | "Shock" | "Seismic";

export const TIER_RANGES: Record<Tier, { min: number; max: number }> = {
  Common:  { min: 0,  max: 39  },
  Notable: { min: 40, max: 64  },
  Shock:   { min: 65, max: 84  },
  Seismic: { min: 85, max: 100 },
};

export function tierFromScore(score: number): Tier {
  if (score >= 85) return "Seismic";
  if (score >= 65) return "Shock";
  if (score >= 40) return "Notable";
  return "Common";
}

// ── Moment triggers (PRD FR-3.2) ─────────────────────────────────────────────

export type TriggerKind = "T1" | "T2" | "T3" | "T4";

// ── Implied probabilities snapshot ───────────────────────────────────────────

export interface ProbabilitySnapshot {
  home: number;   // 0..1
  draw: number;   // 0..1
  away: number;   // 0..1
}

// ── Match ─────────────────────────────────────────────────────────────────────

export type MatchStatus = "scheduled" | "live" | "finished";

export interface Match {
  id: string;
  home: string;
  away: string;
  kickoffUtc: string;        // ISO-8601
  status: MatchStatus;
  minute: number | null;
  score: { home: number; away: number };
  pPreMatch: ProbabilitySnapshot | null;
}

// ── Moment (PRD FR-3.3) ──────────────────────────────────────────────────────

export interface Moment {
  id: string;                // UUID
  matchId: string;
  trigger: TriggerKind;
  minute: number;
  eventUtc: string;          // ISO-8601
  scoreHome: number;
  scoreAway: number;
  pBefore: ProbabilitySnapshot;
  pAfter: ProbabilitySnapshot;
  pPreMatch: ProbabilitySnapshot;
  shockScore: number;        // 0..100
  tier: Tier;
  witnessCount: number;
  sealedAt: string | null;   // ISO-8601; null if not yet sealed
  dedupeKey: string;         // e.g. "matchId:goal:42:1-0"
}

// ── Edition (one claimed copy of a Moment) ───────────────────────────────────

export type ChainStatus = "pending_chain" | "confirmed" | "failed";

export interface Edition {
  id: string;                // UUID
  momentId: string;
  userId: string;
  claimedAt: string;         // ISO-8601
  chainStatus: ChainStatus;
  assetId: string | null;    // Bubblegum asset id once minted
  txSig: string | null;      // Solana tx signature
}

// ── Witness (a user checked in to a match) ───────────────────────────────────

export interface Witness {
  userId: string;
  matchId: string;
  atUtc: string;             // ISO-8601; server-side timestamp (FR-2.2)
}

// ── User ─────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  displayName: string;
  pubkey: string;            // Solana public key (base58); never shown to Greg
}
