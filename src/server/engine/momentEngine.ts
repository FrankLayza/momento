/**
 * src/server/engine/momentEngine.ts
 * Implements FR-3.1–3.4 (PRD) — the Moment Engine.
 *
 * Trigger logic:
 *   T1 — Goal: any goal event
 *   T2 — Red card: any red card event
 *   T3 — Probability quake: implied win probability moves ≥15pp in 5 minutes
 *   T4 — Full-time upset: winning team's pre-match probability was <30%
 *
 * Deduplication: dedupe_key prevents two Moments for the same event (FR-3.4).
 */

import type {
  NormalisedOddsTick,
  NormalisedEvent,
  UnsubscribeFn,
} from "@/server/txline/types";
import { computeShockScore } from "@/lib/score";
import { tierFromScore } from "@/lib/types";
import type { Moment, ProbabilitySnapshot } from "@/lib/types";
import {
  getWitnessesForMatch,
  getMomentsForMatch,
  insertMoment,
} from "@/server/db/queries";

// ── State per tracked match ───────────────────────────────────────────────────

interface PendingSwingMoment {
  trigger: "T1" | "T2";
  minute:  number;
  pBefore: ProbabilitySnapshot;
}

interface MatchState {
  matchId:     string;
  home:        string;
  away:        string;
  pPreMatch:   ProbabilitySnapshot | null;
  latestTick:  NormalisedOddsTick | null;
  tickHistory: Array<{ atUtc: string; tick: NormalisedOddsTick }>;
  score:       { home: number; away: number };
  status:      "scheduled" | "live" | "finished";
  unsub:       UnsubscribeFn;
  /** T1/T2 moments waiting for the next odds tick so pAfter reflects the real post-event swing */
  pending:          PendingSwingMoment[];
  lastKnownMinute:      number | null;
  lastKnownMinuteAtUtc: string | null;
}

const tracked = new Map<string, MatchState>();

// ── Quake window (T3) ─────────────────────────────────────────────────────────

const QUAKE_WINDOW_MS  = 5 * 60 * 1_000;  // 5 minutes
const QUAKE_THRESHOLD  = 0.15;            // 15 percentage points

// ── Public API ────────────────────────────────────────────────────────────────

type AdapterLike = {
  subscribeMatch: (
    matchId: string,
    onTick:  (tick: NormalisedOddsTick) => void,
    onEvent: (event: NormalisedEvent) => void
  ) => UnsubscribeFn;
};

/**
 * Starts tracking a match. Implements FR-3.1.
 * @param adapter  Either the live adapter or the replay module — engine is agnostic.
 */
export function trackMatch(
  matchId: string,
  home: string,
  away: string,
  pPreMatch: ProbabilitySnapshot | null,
  adapter: AdapterLike,
  initialScore: { home: number; away: number } = { home: 0, away: 0 }
): void {
  if (tracked.has(matchId)) return;  // already tracked

  const state: MatchState = {
    matchId,
    home,
    away,
    pPreMatch,
    latestTick:  null,
    tickHistory: [],
    // Seeded from the real current score — matches are often tracked mid-progress
    // (worker restarted, witness checks in after kickoff), so starting from 0-0
    // would misreport scoreHome/scoreAway on every Moment for the rest of the match.
    score:       { ...initialScore },
    status:      "live",
    unsub:       () => undefined,
    pending:     [],
    lastKnownMinute:      null,
    lastKnownMinuteAtUtc: null,
  };

  const unsub = adapter.subscribeMatch(
    matchId,
    (tick)  => handleTick(state, tick),
    (event) => handleEvent(state, event)
  );

  state.unsub = unsub;
  tracked.set(matchId, state);
  console.log(`[momentEngine] Tracking match: ${home} v ${away} (${matchId})`);
}

/**
 * Stops tracking a match (e.g., after full-time + 24h window).
 */
export function untrackMatch(matchId: string): void {
  const state = tracked.get(matchId);
  if (!state) return;
  state.unsub();
  tracked.delete(matchId);
}

// ── Tick handler (T3 — Probability quake) ────────────────────────────────────

function handleTick(state: MatchState, tick: NormalisedOddsTick): void {
  const prev = state.latestTick;
  state.latestTick = tick;
  state.tickHistory.push({ atUtc: tick.atUtc, tick });

  // Prune tick history older than 5 minutes
  const windowStart = Date.now() - QUAKE_WINDOW_MS;
  state.tickHistory = state.tickHistory.filter(
    h => new Date(h.atUtc).getTime() >= windowStart
  );

  // Resolve any T1/T2 moments waiting on a post-event tick, now that one arrived —
  // this is what lets shockScore's swing term reflect the real odds move from the goal/card.
  if (state.pending.length > 0) {
    const toResolve = state.pending;
    state.pending = [];
    for (const p of toResolve) {
      void fireMoment(state, p.trigger, {
        minute:  p.minute,
        pBefore: p.pBefore,
        pAfter:  { home: tick.pHome, draw: tick.pDraw, away: tick.pAway },
        trigger: p.trigger,
      });
    }
  }

  if (!prev || state.tickHistory.length < 2) return;

  // T3: check for ≥15pp swing in any of the three outcomes
  const oldest = state.tickHistory[0]!;
  const checks: Array<[keyof NormalisedOddsTick, keyof NormalisedOddsTick]> = [
    ["pHome", "pHome"],
    ["pDraw", "pDraw"],
    ["pAway", "pAway"],
  ];

  for (const [key] of checks) {
    const before = oldest.tick[key] as number;
    const after  = tick[key] as number;
    if (Math.abs(after - before) >= QUAKE_THRESHOLD) {
      void fireMoment(state, "T3", {
        minute:  estimateMinute(state, tick.atUtc),
        pBefore: { home: oldest.tick.pHome, draw: oldest.tick.pDraw, away: oldest.tick.pAway },
        pAfter:  { home: tick.pHome,         draw: tick.pDraw,         away: tick.pAway },
        trigger: "T3",
      });
      break;
    }
  }
}

// ── Event handler (T1, T2, T4) ───────────────────────────────────────────────

function handleEvent(state: MatchState, event: NormalisedEvent): void {
  const prev = state.latestTick;

  // Anchor for estimateMinute(): every real event carries a feed-derived minute.
  state.lastKnownMinute = event.minute;
  state.lastKnownMinuteAtUtc = event.atUtc;

  if (event.kind === "goal") {
    // Update score — simplified: assume single score increment
    if (event.team === "home") state.score.home++;
    else if (event.team === "away") state.score.away++;

    if (!prev) return;
    // Queue rather than fire immediately: pAfter is resolved from the next odds
    // tick so shockScore's swing term reflects the actual post-goal odds move.
    state.pending.push({
      trigger: "T1",
      minute:  event.minute,
      pBefore: { home: prev.pHome, draw: prev.pDraw, away: prev.pAway },
    });
  }

  if (event.kind === "red_card" && prev) {
    state.pending.push({
      trigger: "T2",
      minute:  event.minute,
      pBefore: { home: prev.pHome, draw: prev.pDraw, away: prev.pAway },
    });
  }

  if (event.kind === "full_time") {
    state.status = "finished";
    if (!state.pPreMatch || !prev) return;

    // T4: winning team's pre-match probability < 30%
    const homeWon = state.score.home > state.score.away;
    const awayWon = state.score.away > state.score.home;
    const pWinner = homeWon
      ? state.pPreMatch.home
      : awayWon
      ? state.pPreMatch.away
      : null;

    if (pWinner !== null && pWinner < 0.30) {
      void fireMoment(state, "T4", {
        minute:  90,
        pBefore: { home: prev.pHome, draw: prev.pDraw, away: prev.pAway },
        pAfter:  { home: prev.pHome, draw: prev.pDraw, away: prev.pAway },
        trigger: "T4",
      });
    }
  }
}

// ── Moment creation ───────────────────────────────────────────────────────────

interface MomentDraft {
  minute:  number;
  pBefore: ProbabilitySnapshot;
  pAfter:  ProbabilitySnapshot;
  trigger: "T1" | "T2" | "T3" | "T4";
}

async function fireMoment(
  state: MatchState,
  triggerKind: Moment["trigger"],
  draft: MomentDraft
): Promise<void> {
  // Dedupe key (FR-3.4)
  const dedupeKey = `${state.matchId}:${triggerKind}:${draft.minute}:${state.score.home}-${state.score.away}`;

  // Check if a Moment with this dedupe_key already exists
  const existing = await getMomentsForMatch(state.matchId);
  if (existing.some(m => m.dedupeKey === dedupeKey)) {
    console.log(`[momentEngine] Dedupe suppressed: ${dedupeKey}`);
    return;
  }

  const pPreMatch = state.pPreMatch ?? draft.pBefore;

  // Determine which pBefore value is "relevant" for the score
  // For T1/T2/T3: use pHome as the primary swing marker; full score uses both
  const pBeforeScalar = draft.pBefore.home;
  const pAfterScalar  = draft.pAfter.home;
  const pPreMatchScalar = pPreMatch.home;

  const { shockScore, tier } = computeShockScore({
    pBefore:   pBeforeScalar,
    pAfter:    pAfterScalar,
    pPreMatch: pPreMatchScalar,
    minute:    draft.minute,
    trigger:   triggerKind,
  });

  // Count witnesses at creation time
  const witnesses = await getWitnessesForMatch(state.matchId);
  const witnessCount = witnesses.length;

  const moment: Omit<Moment, "id"> = {
    matchId:      state.matchId,
    trigger:      triggerKind,
    minute:       draft.minute,
    eventUtc:     new Date().toISOString(),
    scoreHome:    state.score.home,
    scoreAway:    state.score.away,
    pBefore:      draft.pBefore,
    pAfter:       draft.pAfter,
    pPreMatch,
    shockScore,
    tier,
    witnessCount,
    sealedAt:     null,
    dedupeKey,
  };

  try {
    const created = await insertMoment(moment);
    console.log(`[momentEngine] Moment created: ${tier} (score: ${shockScore}) — ${dedupeKey} — id: ${created.id}`);
    // TODO: push Supabase Realtime notification to all witnesses (FR-5.1)
  } catch (err) {
    console.error(`[momentEngine] Failed to insert moment ${dedupeKey}:`, err);
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function estimateMinute(state: MatchState, atUtc: string): number {
  // Anchor off the last feed-reported minute (from a goal/red_card/kickoff event)
  // and extrapolate by elapsed wall-clock time — TxLINE odds ticks don't carry minute.
  if (state.lastKnownMinute === null || state.lastKnownMinuteAtUtc === null) {
    return 0;
  }
  const elapsedMinutes = Math.round(
    (new Date(atUtc).getTime() - new Date(state.lastKnownMinuteAtUtc).getTime()) / 60_000
  );
  return state.lastKnownMinute + Math.max(0, elapsedMinutes);
}
