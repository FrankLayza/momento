/**
 * src/server/txline/adapter.ts
 * Implements §5 (Implementation Guide) — the ONE file that talks to TxLINE.
 *
 * RULE: No other file in this project may import fetch/WebSocket/HTTP and call
 * TxLINE. All external calls go through this file. (Implementation Guide §0, rule 2)
 *
 * !! STUB STATUS !!
 * The internals of this file are stubs until TxLINE docs are pasted into
 * docs/TXLINE-NOTES.md. The three exported functions match the interface that
 * replay.ts also implements, so the engine cannot tell live from replay (FR-1.3).
 */

import { z } from "zod";
import type {
  NormalisedMatch,
  NormalisedOddsTick,
  NormalisedEvent,
  OddsTickCallback,
  MatchEventCallback,
  UnsubscribeFn,
} from "./types";

function getBaseUrl(): string {
  const val = process.env.TXLINE_BASE_URL;
  if (!val) throw new Error("Missing env var: TXLINE_BASE_URL");
  return val;
}

function getApiKey(): string {
  const val = process.env.TXLINE_API_KEY;
  if (!val) throw new Error("Missing env var: TXLINE_API_KEY");
  return val;
}

// ── Odds → implied probability conversion (Implementation Guide §5) ───────────
//
//   Given decimal odds [oddHome, oddDraw, oddAway]:
//     rawP   = 1 / decimal_odd
//     total  = rawPHome + rawPDraw + rawPAway   ← bookmaker overround
//     pHome  = rawPHome / total                 ← normalised, strips margin
//
//   The three normalised values sum to exactly 1.

function decimalOddsToImpliedProbs(
  oddHome: number,
  oddDraw: number,
  oddAway: number
): { pHome: number; pDraw: number; pAway: number } {
  const rawHome = 1 / oddHome;
  const rawDraw = 1 / oddDraw;
  const rawAway = 1 / oddAway;
  const total   = rawHome + rawDraw + rawAway;
  return {
    pHome: rawHome / total,
    pDraw: rawDraw / total,
    pAway: rawAway / total,
  };
}

// ── Zod validators ────────────────────────────────────────────────────────────
// [NEEDS-HUMAN-INPUT: paste the real TxLINE response shapes here so we can
//  define the correct zod schemas. The schemas below are placeholders.]

const RawMatchSchema = z.object({
  // [NEEDS-HUMAN-INPUT: replace with real TxLINE match payload fields]
  id:        z.string(),
  homeTeam:  z.string(),
  awayTeam:  z.string(),
  startTime: z.string(),
  status:    z.string(),
  minute:    z.number().nullable().optional(),
  score:     z.object({ home: z.number(), away: z.number() }).optional(),
  odds:      z.object({
    home: z.number(),
    draw: z.number(),
    away: z.number(),
  }).optional(),
});

const RawOddsTickSchema = z.object({
  // [NEEDS-HUMAN-INPUT: replace with real TxLINE odds tick shape]
  matchId: z.string(),
  ts:      z.string(),
  odds:    z.object({
    home: z.number(),
    draw: z.number(),
    away: z.number(),
  }),
});

const RawEventSchema = z.object({
  // [NEEDS-HUMAN-INPUT: replace with real TxLINE event shape]
  matchId: z.string(),
  ts:      z.string(),
  minute:  z.number(),
  type:    z.string(),
  team:    z.string().nullable().optional(),
});

// ── Normalisation helpers ──────────────────────────────────────────────────────

function normaliseMatch(raw: z.infer<typeof RawMatchSchema>): NormalisedMatch {
  // [NEEDS-HUMAN-INPUT: adjust field mapping to match real TxLINE keys]
  const statusMap: Record<string, NormalisedMatch["status"]> = {
    // [NEEDS-HUMAN-INPUT: map TxLINE status strings to "scheduled"|"live"|"finished"]
    scheduled: "scheduled",
    live:      "live",
    finished:  "finished",
  };

  return {
    id:         raw.id,
    home:       raw.homeTeam,
    away:       raw.awayTeam,
    kickoffUtc: raw.startTime,
    status:     statusMap[raw.status] ?? "scheduled",
    minute:     raw.minute ?? null,
    score:      raw.score ?? { home: 0, away: 0 },
  };
}

function normaliseEvent(raw: z.infer<typeof RawEventSchema>): NormalisedEvent | null {
  // [NEEDS-HUMAN-INPUT: map TxLINE event type strings to "goal"|"red_card"|"kickoff"|"full_time"]
  const kindMap: Record<string, NormalisedEvent["kind"]> = {
    goal:      "goal",
    red_card:  "red_card",
    kickoff:   "kickoff",
    full_time: "full_time",
  };

  const kind = kindMap[raw.type];
  if (!kind) {
    console.warn(`[txline/adapter] Unknown event type: ${raw.type} — skipping`);
    return null;
  }

  const team = raw.team === "home" ? "home"
             : raw.team === "away" ? "away"
             : null;

  return {
    matchId: raw.matchId,
    atUtc:   raw.ts,
    minute:  raw.minute,
    kind,
    team,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all World Cup fixture matches from TxLINE.
 * Implements FR-1.1 (PRD).
 */
export async function listWorldCupMatches(): Promise<NormalisedMatch[]> {
  const baseUrl = getBaseUrl();
  const apiKey  = getApiKey();

  // [NEEDS-HUMAN-INPUT: replace the path below with the real TxLINE fixtures endpoint]
  const url = `${baseUrl}/matches?tournament=world_cup`;

  const res = await fetch(url, {
    headers: {
      // [NEEDS-HUMAN-INPUT: confirm the exact auth header name TxLINE expects]
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 },  // cache for 60s on Vercel
  });

  if (!res.ok) {
    throw new Error(`[txline/adapter] listWorldCupMatches failed: ${res.status} ${res.statusText}`);
  }

  // [NEEDS-HUMAN-INPUT: confirm whether the response is an array or wrapped in a key like { data: [...] }]
  const raw: unknown = await res.json();
  const list = z.array(RawMatchSchema).safeParse(raw);

  if (!list.success) {
    console.error("[txline/adapter] listWorldCupMatches parse error:", list.error.flatten());
    return [];
  }

  return list.data.map(normaliseMatch);
}

/**
 * Returns pre-match implied probabilities for a given match.
 * Implements FR-3.2 T4 (PRD) — pPreMatch needed for full-time upset scoring.
 */
export async function getPrematchProbabilities(
  matchId: string
): Promise<{ pHome: number; pDraw: number; pAway: number } | null> {
  const baseUrl = getBaseUrl();
  const apiKey  = getApiKey();

  // [NEEDS-HUMAN-INPUT: replace with real pre-match odds endpoint]
  const url = `${baseUrl}/matches/${matchId}/prematch-odds`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    console.warn(`[txline/adapter] getPrematchProbabilities failed for ${matchId}: ${res.status}`);
    return null;
  }

  // [NEEDS-HUMAN-INPUT: adjust field mapping to match real TxLINE response]
  const raw: unknown = await res.json();
  const parsed = z.object({
    odds: z.object({ home: z.number(), draw: z.number(), away: z.number() }),
  }).safeParse(raw);

  if (!parsed.success) {
    console.warn("[txline/adapter] getPrematchProbabilities parse error:", parsed.error.flatten());
    return null;
  }

  return decimalOddsToImpliedProbs(
    parsed.data.odds.home,
    parsed.data.odds.draw,
    parsed.data.odds.away
  );
}

/**
 * Subscribes to live odds + event updates for a match.
 * Implements FR-3.1 (PRD) — poll/subscribe every 60s or faster.
 *
 * Returns an unsubscribe function.
 *
 * IMPORTANT: replay.ts implements this same signature reading from a .jsonl
 * fixture, so the engine cannot tell live from replay (FR-1.3).
 */
export function subscribeMatch(
  matchId: string,
  onTick:  OddsTickCallback,
  onEvent: MatchEventCallback
): UnsubscribeFn {
  const baseUrl = getBaseUrl();
  const apiKey  = getApiKey();

  // [NEEDS-HUMAN-INPUT: TxLINE may use WebSocket, SSE, or polling.
  //  Implement the appropriate connection here.
  //  Stub below uses a polling fallback at 60s intervals.]

  console.warn(
    `[txline/adapter] subscribeMatch(${matchId}) — stub. Paste TxLINE docs into docs/TXLINE-NOTES.md.`
  );

  // ── Polling stub (replace with real WebSocket/SSE once docs are available) ─
  const intervalMs = 60_000;

  const poll = async () => {
    // [NEEDS-HUMAN-INPUT: replace with real live odds + events endpoint]
    const url = `${baseUrl}/matches/${matchId}/live`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        console.error(`[txline/adapter] poll error: ${res.status}`);
        return;
      }
      const raw: unknown = await res.json();

      // [NEEDS-HUMAN-INPUT: adjust to real response shape that contains both
      //  current odds and any new events]

      // Try to parse as an odds tick
      const tick = RawOddsTickSchema.safeParse(raw);
      if (tick.success) {
        const { pHome, pDraw, pAway } = decimalOddsToImpliedProbs(
          tick.data.odds.home,
          tick.data.odds.draw,
          tick.data.odds.away
        );
        const normTick: NormalisedOddsTick = {
          matchId,
          atUtc: tick.data.ts,
          pHome,
          pDraw,
          pAway,
        };
        onTick(normTick);
      }

      // Try to parse events array
      const events = z.array(RawEventSchema).safeParse(raw);
      if (events.success) {
        for (const rawEvent of events.data) {
          const normEvent = normaliseEvent(rawEvent);
          if (normEvent) onEvent(normEvent);
        }
      }
    } catch (err) {
      console.error("[txline/adapter] poll threw:", err);
    }
  };

  const timerId = setInterval(() => { void poll(); }, intervalMs);
  // Run immediately
  void poll();

  return () => clearInterval(timerId);
}
