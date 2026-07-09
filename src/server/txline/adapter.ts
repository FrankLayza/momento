/**
 * src/server/txline/adapter.ts
 * Implements §5 (Implementation Guide) — the ONE file that talks to TxLINE.
 *
 * RULE: No other file in this project may import fetch/WebSocket/HTTP and call
 * TxLINE. All external calls go through this file. (Implementation Guide §0, rule 2)
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

// ── Environment ───────────────────────────────────────────────────────────────

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

// ── Guest JWT caching & refresh ───────────────────────────────────────────────

let cachedJwt: string | null = null;
let jwtExpiresAt = 0;

async function getGuestJwt(): Promise<string> {
  if (cachedJwt && Date.now() < jwtExpiresAt - 60_000) {
    return cachedJwt;
  }

  const origin = getBaseUrl(); // e.g. https://txline-dev.txodds.com (no /api prefix)
  const url = `${origin}/auth/guest/start`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch guest JWT: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { token: string };
  cachedJwt = data.token;

  try {
    const payloadBase64 = data.token.split(".")[1];
    if (payloadBase64) {
      const payload = JSON.parse(
        Buffer.from(payloadBase64, "base64").toString("utf-8")
      ) as { exp?: number };
      if (payload.exp) {
        jwtExpiresAt = payload.exp * 1000;
        return cachedJwt;
      }
    }
  } catch {
    // fallback
  }

  jwtExpiresAt = Date.now() + 30 * 60 * 1000; // 30 min default TTL
  return cachedJwt;
}

async function getRequestHeaders(): Promise<HeadersInit> {
  const jwt = await getGuestJwt();
  const apiToken = getApiKey();
  return {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
    "Content-Type": "application/json",
  };
}

// ── Odds → implied probability conversion (Implementation Guide §5) ───────────

function decimalOddsToImpliedProbs(
  oddHome: number,
  oddDraw: number,
  oddAway: number
): { pHome: number; pDraw: number; pAway: number } {
  const rawHome = 1 / oddHome;
  const rawDraw = 1 / oddDraw;
  const rawAway = 1 / oddAway;
  const total = rawHome + rawDraw + rawAway;
  return {
    pHome: rawHome / total,
    pDraw: rawDraw / total,
    pAway: rawAway / total,
  };
}

// ── Zod validators ────────────────────────────────────────────────────────────

const RawMatchSchema = z.object({
  FixtureId: z.number(),
  StartTime: z.number(), // Unix timestamp in ms
  Participant1: z.string(),
  Participant2: z.string(),
  Participant1IsHome: z.boolean(),
  Competition: z.string().optional().nullable(),
  GameState: z.number().optional().nullable(),
  Score: z
    .object({
      home: z.number(),
      away: z.number(),
    })
    .optional()
    .nullable(),
});

// ── Normalisation helpers ──────────────────────────────────────────────────────

function normaliseMatch(raw: z.infer<typeof RawMatchSchema>): NormalisedMatch {
  const home = raw.Participant1IsHome ? raw.Participant1 : raw.Participant2;
  const away = raw.Participant1IsHome ? raw.Participant2 : raw.Participant1;

  // GamePhase ID mappings from notes section 8
  let status: NormalisedMatch["status"] = "scheduled";
  if (raw.GameState !== undefined && raw.GameState !== null) {
    const gs = raw.GameState;
    if (gs === 1) {
      status = "scheduled";
    } else if ([2, 3, 4, 6, 7, 8, 9, 11, 12].includes(gs)) {
      status = "live";
    } else if ([5, 10, 13].includes(gs)) {
      status = "finished";
    }
  }

  return {
    id: String(raw.FixtureId),
    home,
    away,
    kickoffUtc: new Date(raw.StartTime).toISOString(),
    status,
    minute: null,
    score: raw.Score ?? { home: 0, away: 0 },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all World Cup fixture matches from TxLINE.
 * Implements FR-1.1 (PRD).
 */
export async function listWorldCupMatches(): Promise<NormalisedMatch[]> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/fixtures/snapshot`;

  const headers = await getRequestHeaders();
  const res = await fetch(url, { headers, next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(
      `[txline/adapter] listWorldCupMatches failed: ${res.status} ${res.statusText}`
    );
  }

  const raw: unknown = await res.json();
  const list = z.array(RawMatchSchema).safeParse(raw);

  if (!list.success) {
    console.error(
      "[txline/adapter] listWorldCupMatches parse error:",
      list.error.flatten()
    );
    console.log("[txline/adapter] Raw response received:", JSON.stringify(raw, null, 2));
    return [];
  }

  // Filter for World Cup & Friendlies matches
  return list.data
    .filter((fixture) => {
      const comp = (fixture.Competition || "").toLowerCase();
      return (
        comp.includes("world cup") ||
        comp.includes("friendlies")
      );
    })
    .map(normaliseMatch);
}

// Flexible odds extractor supporting multiple bookmaker payload schemas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractOdds(raw: any): { home: number; draw: number; away: number } | null {
  if (!raw) return null;
  const o = raw.odds || raw;
  const home = o.OddsHome ?? o.Odds1 ?? o.home ?? o.homeOdds ?? o.odds1 ?? o.oddsHome ?? o["1"];
  const draw = o.OddsDraw ?? o.OddsX ?? o.draw ?? o.drawOdds ?? o.oddsX ?? o.oddsDraw ?? o["X"];
  const away = o.OddsAway ?? o.Odds2 ?? o.away ?? o.awayOdds ?? o.odds2 ?? o.oddsAway ?? o["2"];

  if (typeof home === "number" && typeof draw === "number" && typeof away === "number") {
    return { home, draw, away };
  }
  return null;
}

/**
 * Returns pre-match implied probabilities for a given match.
 * Implements FR-3.2 T4 (PRD) — pPreMatch needed for full-time upset scoring.
 */
export async function getPrematchProbabilities(
  matchId: string
): Promise<{ pHome: number; pDraw: number; pAway: number } | null> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/odds/snapshot/${matchId}`;

  const headers = await getRequestHeaders();
  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.warn(
      `[txline/adapter] getPrematchProbabilities failed for ${matchId}: ${res.status}`
    );
    return null;
  }

  const raw: unknown = await res.json();
  const odds = extractOdds(raw);
  if (!odds) {
    console.warn(`[txline/adapter] Could not extract odds from:`, raw);
    return null;
  }

  return decimalOddsToImpliedProbs(odds.home, odds.draw, odds.away);
}

/**
 * Subscribes to live odds + event updates for a match.
 * Implements FR-3.1 (PRD) — poll/subscribe every 60s or faster.
 *
 * Returns an unsubscribe function.
 */
export function subscribeMatch(
  matchId: string,
  onTick: OddsTickCallback,
  onEvent: MatchEventCallback
): UnsubscribeFn {
  const baseUrl = getBaseUrl();
  const intervalMs = 30_000; // Poll every 30 seconds defensively

  let lastHomeScore = 0;
  let lastAwayScore = 0;
  let hasKickoffFired = false;

  const poll = async () => {
    try {
      const headers = await getRequestHeaders();
      
      // Fetch score snapshot
      const scoreRes = await fetch(`${baseUrl}/api/scores/snapshot/${matchId}`, { headers });
      // Fetch odds snapshot
      const oddsRes = await fetch(`${baseUrl}/api/odds/snapshot/${matchId}`, { headers });

      if (!scoreRes.ok || !oddsRes.ok) {
        console.error(
          `[txline/adapter] poll failed. Score: ${scoreRes.status}, Odds: ${oddsRes.status}`
        );
        return;
      }

      const scoreRaw = (await scoreRes.json()) as {
        Status?: string;
        Score?: { home: number; away: number };
        Minute?: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Events?: any[];
      };
      
      const oddsRaw = await oddsRes.json();

      // Process Odds
      const odds = extractOdds(oddsRaw);
      if (odds) {
        const { pHome, pDraw, pAway } = decimalOddsToImpliedProbs(
          odds.home,
          odds.draw,
          odds.away
        );
        onTick({
          matchId,
          atUtc: new Date().toISOString(),
          pHome,
          pDraw,
          pAway,
        });
      }

      // Process Status / Events
      const status = (scoreRaw.Status || "").toUpperCase();
      const currentMinute = scoreRaw.Minute ?? 0;

      // Synthesize Kickoff
      if (
        !hasKickoffFired &&
        ["H1", "HT", "H2", "WET", "ET1", "HTET", "ET2", "WPE", "PE"].includes(status)
      ) {
        hasKickoffFired = true;
        onEvent({
          matchId,
          atUtc: new Date().toISOString(),
          minute: currentMinute || 1,
          kind: "kickoff",
          team: null,
        });
      }

      // Synthesize Goals
      if (scoreRaw.Score) {
        const homeScore = scoreRaw.Score.home;
        const awayScore = scoreRaw.Score.away;

        if (homeScore > lastHomeScore) {
          onEvent({
            matchId,
            atUtc: new Date().toISOString(),
            minute: currentMinute,
            kind: "goal",
            team: "home",
          });
          lastHomeScore = homeScore;
        }

        if (awayScore > lastAwayScore) {
          onEvent({
            matchId,
            atUtc: new Date().toISOString(),
            minute: currentMinute,
            kind: "goal",
            team: "away",
          });
          lastAwayScore = awayScore;
        }
      }

      // Synthesize Full Time
      if (["F", "FET", "FPE"].includes(status)) {
        onEvent({
          matchId,
          atUtc: new Date().toISOString(),
          minute: currentMinute || 90,
          kind: "full_time",
          team: null,
        });
      }
    } catch (err) {
      console.error("[txline/adapter] poll error:", err);
    }
  };

  const timerId = setInterval(() => {
    void poll();
  }, intervalMs);
  
  // Trigger immediate poll
  void poll();

  return () => clearInterval(timerId);
}
