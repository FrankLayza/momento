/**
 * src/server/txline/replay.ts
 * Implements FR-1.3 (PRD) — Replay Mode.
 *
 * Reads a fixtures/replay/*.jsonl file and streams events at Nx speed,
 * exposing the same three-function interface as adapter.ts so that the
 * Moment Engine cannot distinguish live from replay.
 *
 * Each line of the JSONL file is one of:
 *   { type: "tick",  data: NormalisedOddsTick  }
 *   { type: "event", data: NormalisedEvent     }
 *   { type: "meta",  matchId: string, startUtc: string }
 *
 * Record fixtures using: pnpm record:match
 * Synthesise from historical data: pnpm synthesize:replay
 */

import * as fs   from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import type {
  NormalisedMatch,
  NormalisedOddsTick,
  NormalisedEvent,
  OddsTickCallback,
  MatchEventCallback,
  UnsubscribeFn,
  TimelineEvent,
  MatchStats,
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(process.cwd(), "fixtures", "replay");
const STATE_FILE   = path.join(process.cwd(), "tmp", "replay_state.json");
const DEFAULT_SPEED = 60; // 60× — configurable per launch

export interface ReplayMatchState {
  matchId: string;
  minute: number | null;
  phase: "H1" | "HT" | "H2" | "FT" | "ET1" | "ET2" | "PEN" | null;
  score: { home: number; away: number };
  status: "scheduled" | "live" | "finished";
  latestTick: { pHome: number; pDraw: number; pAway: number } | null;
  timeline: TimelineEvent[];
  stats: MatchStats;
}

export function writeReplayState(matchId: string, state: Partial<ReplayMatchState>) {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    let allStates: Record<string, ReplayMatchState> = {};
    if (fs.existsSync(STATE_FILE)) {
      try {
        allStates = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
      } catch {
        allStates = {};
      }
    }
    
    const current = allStates[matchId] || {
      matchId,
      minute: null,
      phase: null,
      score: { home: 0, away: 0 },
      status: "live",
      latestTick: null,
      timeline: [],
      stats: {
        home: { possession: 50, shots: 0, corners: 0, freeKicks: 0, throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        away: { possession: 50, shots: 0, corners: 0, freeKicks: 0, throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        momentum: []
      }
    };
    
    allStates[matchId] = {
      ...current,
      ...state,
      score: state.score ? { ...current.score, ...state.score } : current.score,
      stats: state.stats ? { ...current.stats, ...state.stats } : current.stats,
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(allStates, null, 2), "utf-8");
  } catch (err) {
    console.error("[replay] Failed to write replay state:", err);
  }
}

export function readReplayState(matchId: string): ReplayMatchState | null {
  try {
    if (!fs.existsSync(STATE_FILE)) return null;
    const allStates = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return allStates[matchId] || null;
  } catch {
    return null;
  }
}

// ── JSONL line schemas ────────────────────────────────────────────────────────

const TickLineSchema = z.object({
  type: z.literal("tick"),
  data: z.object({
    matchId: z.string(),
    atUtc:   z.string(),
    pHome:   z.number(),
    pDraw:   z.number(),
    pAway:   z.number(),
  }),
});

const EventLineSchema = z.object({
  type: z.literal("event"),
  data: z.object({
    matchId: z.string(),
    atUtc:   z.string(),
    minute:  z.number(),
    kind:    z.enum(["goal", "red_card", "kickoff", "full_time"]),
    team:    z.enum(["home", "away"]).nullable(),
  }),
});

const MetaLineSchema = z.object({
  type:     z.literal("meta"),
  matchId:  z.string(),
  home:     z.string(),
  away:     z.string(),
  startUtc: z.string(),
});

// ── Per-match replay state ────────────────────────────────────────────────────
// Tracks whether each replay fixture has been streamed to completion so that
// the worker's next syncFixtures() call transitions it from "live" → "finished".

const completedMatches = new Set<string>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all matches available as replay fixtures.
 * Reads meta lines from each .jsonl file in fixtures/replay/.
 *
 * CRITICAL: returns status "live" (not "finished") until the replay stream
 * for that match finishes — otherwise the worker's syncFixtures() would skip
 * tracking entirely and the engine would never subscribe.
 */
export async function listWorldCupMatches(): Promise<NormalisedMatch[]> {
  if (!fs.existsSync(FIXTURES_DIR)) return [];
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".jsonl"));
  const matches: NormalisedMatch[] = [];

  let allStates: Record<string, any> = {};
  if (fs.existsSync(STATE_FILE)) {
    try {
      allStates = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    } catch {}
  }

  for (const file of files) {
    const filePath = path.join(FIXTURES_DIR, file);
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try { parsed = JSON.parse(line); } catch { continue; }

      const meta = MetaLineSchema.safeParse(parsed);
      if (meta.success) {
        const mId = meta.data.matchId;
        const replayState = allStates[mId];

        matches.push({
          id:         mId,
          home:       meta.data.home,
          away:       meta.data.away,
          kickoffUtc: meta.data.startUtc,
          status:     replayState ? replayState.status : (completedMatches.has(mId) ? "finished" : "live"),
          minute:     replayState ? replayState.minute : null,
          score:      replayState ? replayState.score : { home: 0, away: 0 },
          phase:      replayState ? replayState.phase : null,
        });
        break; // only need meta line per file
      }
    }
  }

  return matches;
}

/**
 * Returns pre-match probabilities from the fixture file's first tick.
 */
export async function getPrematchProbabilities(
  matchId: string
): Promise<{ pHome: number; pDraw: number; pAway: number } | null> {
  const filePath = findFixtureFile(matchId);
  if (!filePath) return null;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    let parsed: unknown;
    try { parsed = JSON.parse(line); } catch { continue; }
    const tick = TickLineSchema.safeParse(parsed);
    if (tick.success && tick.data.data.matchId === matchId) {
      rl.close();
      return {
        pHome: tick.data.data.pHome,
        pDraw: tick.data.data.pDraw,
        pAway: tick.data.data.pAway,
      };
    }
  }
  return null;
}

/**
 * Subscribes to a replay fixture, streaming events at speedMultiplier× real speed.
 * Returns an unsubscribe function (same interface as adapter.ts).
 * FR-1.3 — Replay Mode MUST behave identically to live mode from the engine's POV.
 */
export function subscribeMatch(
  matchId: string,
  onTick:  OddsTickCallback,
  onEvent: MatchEventCallback,
  speedMultiplier: number = DEFAULT_SPEED
): UnsubscribeFn {
  let cancelled = false;

  const run = async () => {
    const filePath = findFixtureFile(matchId);
    if (!filePath) {
      console.error(`[replay] No fixture file found for matchId: ${matchId}`);
      return;
    }

    // Initialize replay match state in the file
    writeReplayState(matchId, {
      minute: 1,
      phase: "H1",
      score: { home: 0, away: 0 },
      status: "live",
      timeline: [],
      stats: {
        home: { possession: 50, shots: 0, corners: 0, freeKicks: 0, throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        away: { possession: 50, shots: 0, corners: 0, freeKicks: 0, throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0 },
        momentum: []
      }
    });

    console.log(`[replay] Streaming ${path.basename(filePath)} at ${speedMultiplier}× speed`);

    const lines = await readAllLines(filePath);
    let prevTimestamp: number | null = null;

    for (const line of lines) {
      if (cancelled) break;
      if (!line.trim()) continue;

      let parsed: unknown;
      try { parsed = JSON.parse(line); } catch { continue; }

      // Extract timestamp and compute delay
      const atUtc = extractTimestamp(parsed);
      if (atUtc && prevTimestamp !== null) {
        const realDeltaMs = new Date(atUtc).getTime() - prevTimestamp;
        const replayDelayMs = Math.max(0, realDeltaMs / speedMultiplier);
        await sleep(replayDelayMs);
      }
      if (atUtc) prevTimestamp = new Date(atUtc).getTime();

      if (cancelled) break;

      // Dispatch to callbacks
      const tick = TickLineSchema.safeParse(parsed);
      if (tick.success) {
        const tickData = tick.data.data;
        onTick(tickData as NormalisedOddsTick);
        
        const currentState = readReplayState(matchId);
        const currentMin = currentState?.minute ?? 1;
        const currentPhase = currentMin > 90 ? "ET1" : currentMin > 45 ? "H2" : "H1";

        writeReplayState(matchId, {
          latestTick: { pHome: tickData.pHome, pDraw: tickData.pDraw, pAway: tickData.pAway },
          phase: currentPhase
        });
        continue;
      }

      const event = EventLineSchema.safeParse(parsed);
      if (event.success) {
        const ev = event.data.data;
        onEvent(ev as NormalisedEvent);

        const currentState = readReplayState(matchId);
        const currentScore = { ...(currentState?.score ?? { home: 0, away: 0 }) };
        const currentStats = { ...(currentState?.stats ?? {
          home: { possession: 50, shots: 0, corners: 0, freeKicks: 0, throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0 },
          away: { possession: 50, shots: 0, corners: 0, freeKicks: 0, throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0 },
          momentum: []
        }) };
        const currentTimeline = [...(currentState?.timeline ?? [])];

        let newPhase = currentState?.phase ?? "H1";
        if (ev.kind === "kickoff") {
          newPhase = ev.minute > 45 ? "H2" : "H1";
        } else if (ev.kind === "full_time") {
          newPhase = "FT";
        } else if (ev.kind === "goal") {
          if (ev.team === "home") {
            currentScore.home++;
            currentStats.home.shots++;
          } else if (ev.team === "away") {
            currentScore.away++;
            currentStats.away.shots++;
          }
          currentTimeline.push({
            minute: ev.minute,
            kind: "goal",
            team: ev.team,
            scoreHome: currentScore.home,
            scoreAway: currentScore.away,
            phase: newPhase
          });
        } else if (ev.kind === "red_card") {
          if (ev.team === "home") {
            currentStats.home.redCards++;
          } else if (ev.team === "away") {
            currentStats.away.redCards++;
          }
          currentTimeline.push({
            minute: ev.minute,
            kind: "red_card",
            team: ev.team,
            scoreHome: currentScore.home,
            scoreAway: currentScore.away,
            phase: newPhase
          });
        }

        // Compute simple momentum based on goals/events
        const momentumValue = ev.kind === "goal" ? (ev.team === "home" ? 25 : -25) : 0;
        const currentMomentum = [...(currentStats.momentum ?? [])];
        currentMomentum.push({ minute: ev.minute, value: momentumValue });

        writeReplayState(matchId, {
          minute: ev.minute,
          phase: newPhase,
          score: currentScore,
          status: ev.kind === "full_time" ? "finished" : "live",
          timeline: currentTimeline,
          stats: {
            ...currentStats,
            momentum: currentMomentum
          }
        });
      }
    }

    // Mark this match as completed so the next listWorldCupMatches() call
    // returns "finished" — the worker will then untrack it and seal it.
    completedMatches.add(matchId);
    console.log(`[replay] Fixture ${matchId} complete — marked as finished for next sync.`);
    
    // Final state update to finished
    writeReplayState(matchId, {
      status: "finished"
    });
  };

  void run();

  return () => { cancelled = true; };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findFixtureFile(matchId: string): string | null {
  if (!fs.existsSync(FIXTURES_DIR)) return null;
  const files = fs.readdirSync(FIXTURES_DIR);
  const match = files.find(f => f.includes(matchId) && f.endsWith(".jsonl"));
  return match ? path.join(FIXTURES_DIR, match) : null;
}

async function readAllLines(filePath: string): Promise<string[]> {
  const lines: string[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });
  for await (const line of rl) lines.push(line);
  return lines;
}

function extractTimestamp(parsed: unknown): string | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (obj["type"] === "tick" || obj["type"] === "event") {
    const data = obj["data"];
    if (typeof data === "object" && data !== null) {
      const d = data as Record<string, unknown>;
      if (typeof d["atUtc"] === "string") return d["atUtc"];
    }
  }
  return null;
}
