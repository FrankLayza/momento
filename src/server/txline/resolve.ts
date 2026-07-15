/**
 * src/server/txline/resolve.ts
 * Unified adapter resolver — mirrors the worker's getAdapter() pattern.
 *
 * All web pages and API routes MUST import TxLINE functions from here
 * (not directly from adapter.ts or replay.ts). This ensures REPLAY_MODE=true
 * routes fixture/odds/subscription calls through replay.ts so the UI
 * reflects replay data rather than the live TxLINE feed.
 *
 * Functions that replay.ts does not implement (getMatchTimeline,
 * getMatchLineups, getMatchStats, getLiveMatchState, getFinishedMatchScore)
 * fall back to the live adapter when not in replay mode and return
 * null/empty when in replay mode — the UI already handles null gracefully.
 */

import type {
  NormalisedMatch,
  NormalisedOddsTick,
  TimelineEvent,
  MatchLineups,
  MatchStats,
} from "./types";

const isReplay = () => process.env.REPLAY_MODE === "true";

// ── Functions available in both live and replay ──────────────────────────────

export async function listWorldCupMatches(): Promise<NormalisedMatch[]> {
  if (isReplay()) {
    const mod = await import("./replay");
    return mod.listWorldCupMatches();
  }
  const mod = await import("./adapter");
  return mod.listWorldCupMatches();
}

export async function getPrematchProbabilities(
  matchId: string
): Promise<{ pHome: number; pDraw: number; pAway: number } | null> {
  if (isReplay()) {
    const mod = await import("./replay");
    const state = mod.readReplayState(matchId);
    if (state && state.latestTick) {
      return state.latestTick;
    }
    return mod.getPrematchProbabilities(matchId);
  }
  const mod = await import("./adapter");
  return mod.getPrematchProbabilities(matchId);
}

// ── Functions only available in live mode (replay returns null) ──────────────

export async function getLiveMatchState(
  matchId: string
): Promise<{ score: { home: number; away: number }; minute: number | null; status: string; phase: NormalisedMatch["phase"] } | null> {
  if (isReplay()) {
    const mod = await import("./replay");
    const state = mod.readReplayState(matchId);
    if (!state) return null;
    return {
      score: state.score,
      minute: state.minute,
      status: state.status,
      phase: state.phase,
    };
  }
  const mod = await import("./adapter");
  return mod.getLiveMatchState(matchId);
}

export async function getFinishedMatchScore(
  matchId: string
): Promise<{ home: number; away: number }> {
  if (isReplay()) {
    const mod = await import("./replay");
    const state = mod.readReplayState(matchId);
    if (state) return state.score;
    return { home: 0, away: 0 };
  }
  const mod = await import("./adapter");
  return mod.getFinishedMatchScore(matchId);
}

export async function getMatchTimeline(matchId: string): Promise<TimelineEvent[]> {
  if (isReplay()) {
    const mod = await import("./replay");
    const state = mod.readReplayState(matchId);
    return state ? state.timeline : [];
  }
  const mod = await import("./adapter");
  return mod.getMatchTimeline(matchId);
}

export async function getMatchLineups(matchId: string): Promise<MatchLineups | null> {
  if (isReplay()) return null;
  const mod = await import("./adapter");
  return mod.getMatchLineups(matchId);
}

export async function getMatchStats(matchId: string): Promise<MatchStats | null> {
  if (isReplay()) {
    const mod = await import("./replay");
    const state = mod.readReplayState(matchId);
    return state ? state.stats : null;
  }
  const mod = await import("./adapter");
  return mod.getMatchStats(matchId);
}
