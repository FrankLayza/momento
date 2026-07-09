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
} from "./types";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(process.cwd(), "fixtures", "replay");
const DEFAULT_SPEED = 60; // 60× — configurable per launch

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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all matches available as replay fixtures.
 * Reads meta lines from each .jsonl file in fixtures/replay/.
 */
export async function listWorldCupMatches(): Promise<NormalisedMatch[]> {
  const files = fs.readdirSync(FIXTURES_DIR).filter(f => f.endsWith(".jsonl"));
  const matches: NormalisedMatch[] = [];

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
        matches.push({
          id:         meta.data.matchId,
          home:       meta.data.home,
          away:       meta.data.away,
          kickoffUtc: meta.data.startUtc,
          status:     "finished",
          minute:     null,
          score:      { home: 0, away: 0 },
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
        onTick(tick.data.data as NormalisedOddsTick);
        continue;
      }

      const event = EventLineSchema.safeParse(parsed);
      if (event.success) {
        onEvent(event.data.data as NormalisedEvent);
      }
    }

    console.log(`[replay] Fixture ${matchId} complete.`);
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
