/**
 * src/server/txline/adapter.ts
 * Implements §5 (Implementation Guide) — the ONE file that talks to TxLINE.
 *
 * RULE: No other file in this project may import fetch/WebSocket/HTTP and call
 * TxLINE. All external calls go through this file. (Implementation Guide §0, rule 2)
 *
 * ── Response shapes confirmed against the live API on 2026-07-10 ──
 *
 * /api/fixtures/snapshot
 *   Array of { FixtureId, StartTime (ms), Participant1, Participant2,
 *              Participant1IsHome, Competition, GameState }.
 *   GameState is a NUMBER but it is STALE — stays at 1 ("NS") even for live
 *   matches. Do NOT trust it to determine live/finished status.
 *
 * /api/scores/snapshot/{id}
 *   Array of event-delta records. Each has:
 *     StatusId  (number, correctly updating: 1=NS, 2=H1, 3=HT, 4=H2, 5=F ...)
 *     Clock     { Running, Seconds }
 *     Score     { Participant1: { Total: { Goals } }, Participant2: { Total: { Goals } } }
 *     Action    "goal" | "yellow_card" | "red_card" | "throw_in" | ...
 *     Stats     Record<string, number> (key "1"=P1 goals, "2"=P2 goals, "5"/"6"=reds)
 *     Participant1IsHome: boolean
 *     Confirmed: boolean
 *
 * /api/odds/snapshot/{id}
 *   Array of market objects by SuperOddsType.
 *   1X2 market: SuperOddsType="1X2_PARTICIPANT_RESULT"
 *     Prices    [part1, draw, part2] in millicents (÷1000 = decimal odds)
 *     Pct       ["53.821", "31.716", "14.451"] — already de-margined probabilities
 *     InRunning boolean
 */

import { z } from "zod";
import tls from "node:tls";
import type {
  NormalisedMatch,
  NormalisedOddsTick,
  NormalisedEvent,
  OddsTickCallback,
  MatchEventCallback,
  UnsubscribeFn,
} from "./types";

// On some networks, Node's TLS 1.3 handshake to TxLINE's CloudFront-fronted
// dev API stalls for 20-30s (or hits undici's 10s connect timeout) even
// though TCP connects instantly and other TLS clients (e.g. curl/schannel)
// handshake in ~1s — a TLS 1.3 negotiation quirk specific to this endpoint.
// Capping Node's max TLS version to 1.2 avoids the stall entirely.
tls.DEFAULT_MAX_VERSION = "TLSv1.2";

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

// ── Zod validators — Fixture ──────────────────────────────────────────────────

const RawFixtureSchema = z.object({
  FixtureId: z.number(),
  StartTime: z.number(), // Unix timestamp in ms
  Participant1: z.string(),
  Participant2: z.string(),
  Participant1IsHome: z.boolean(),
  Competition: z.string().optional().nullable(),
  // GameState is a number but STALE on the fixture endpoint — do NOT use for live detection
  GameState: z.number().optional().nullable(),
});

// ── Zod validators — Score snapshot record ────────────────────────────────────

const ScoreParticipantSchema = z.object({
  Goals: z.number().optional().default(0),
  YellowCards: z.number().optional().default(0),
  RedCards: z.number().optional().default(0),
  Corners: z.number().optional().default(0),
}).passthrough();

const ScoreBlockSchema = z.object({
  Participant1: z.object({
    Total: ScoreParticipantSchema.optional(),
    H1: ScoreParticipantSchema.optional(),
    HT: ScoreParticipantSchema.optional(),
    H2: ScoreParticipantSchema.optional(),
  }).passthrough().optional(),
  Participant2: z.object({
    Total: ScoreParticipantSchema.optional(),
    H1: ScoreParticipantSchema.optional(),
    HT: ScoreParticipantSchema.optional(),
    H2: ScoreParticipantSchema.optional(),
  }).passthrough().optional(),
}).passthrough();

const ScoreRecordSchema = z.object({
  FixtureId: z.number().optional(),
  StatusId: z.number().optional(), // 1=NS,2=H1,3=HT,4=H2,5=F,6=WET,7=ET1,8=HTET,9=ET2,10=FET,11=WPE,12=PE,13=FPE
  Clock: z.object({
    Running: z.boolean().optional().default(false),
    Seconds: z.number().optional().default(0),
  }).passthrough().optional().nullable(),
  Score: ScoreBlockSchema.optional().nullable(),
  Action: z.string().optional().nullable(), // "goal","yellow_card","red_card","throw_in",...
  Confirmed: z.boolean().optional().nullable(),
  Participant1IsHome: z.boolean().optional(),
  Stats: z.record(z.string(), z.number()).optional().nullable(),
  Participant: z.number().optional().nullable(), // which participant this event applies to (1 or 2)
  Ts: z.number().optional().nullable(),
  Seq: z.number().optional().nullable(),
}).passthrough();

// ── Zod validators — Odds snapshot record ─────────────────────────────────────

const OddsRecordSchema = z.object({
  FixtureId: z.number(),
  SuperOddsType: z.string(),
  PriceNames: z.array(z.string()).optional().nullable(),
  Prices: z.array(z.number()).optional().nullable(),       // millicents
  Pct: z.array(z.string()).optional().nullable(),           // de-margined percentages
  InRunning: z.boolean().optional().nullable(),
  Bookmaker: z.string().optional().nullable(),
}).passthrough();

// ── StatusId → NormalisedMatch.status mapping ────────────────────────────────

function statusIdToStatus(statusId: number): NormalisedMatch["status"] {
  if (statusId === 1) return "scheduled";
  if ([2, 3, 4, 6, 7, 8, 9, 11, 12].includes(statusId)) return "live";
  if ([5, 10, 13].includes(statusId)) return "finished";
  return "scheduled"; // 14-19: interrupted/abandoned/cancelled → treat as scheduled
}

// ── Normalisation helpers ──────────────────────────────────────────────────────

function normaliseMatch(
  raw: z.infer<typeof RawFixtureSchema>,
  liveStatus?: NormalisedMatch["status"],
  liveScore?: { home: number; away: number },
  liveMinute?: number | null
): NormalisedMatch {
  const home = raw.Participant1IsHome ? raw.Participant1 : raw.Participant2;
  const away = raw.Participant1IsHome ? raw.Participant2 : raw.Participant1;

  // Use liveStatus from scores endpoint if available; fixture GameState is stale
  let status: NormalisedMatch["status"] = "scheduled";
  if (liveStatus) {
    status = liveStatus;
  } else {
    // Fallback: infer from kickoff time (fixture GameState is unreliable)
    const kickoff = new Date(raw.StartTime).getTime();
    const now = Date.now();
    if (now >= kickoff && now < kickoff + 150 * 60 * 1000) {
      // Kicked off within last 2.5 hours — likely live or recently finished
      status = "live"; // will be refined by scores endpoint
    } else if (now >= kickoff + 150 * 60 * 1000) {
      status = "finished";
    }
  }

  return {
    id: String(raw.FixtureId),
    home,
    away,
    kickoffUtc: new Date(raw.StartTime).toISOString(),
    status,
    minute: liveMinute ?? null,
    score: liveScore ?? { home: 0, away: 0 },
    competition: raw.Competition ?? undefined,
  };
}

// ── Score extraction from a score record array ───────────────────────────────

interface ParsedScoreState {
  status: NormalisedMatch["status"];
  statusId: number;
  score: { home: number; away: number };
  minute: number | null;
  /** All unique actions seen in the record array, with their seq numbers */
  events: Array<{
    action: string;
    participant: number | null;
    seq: number;
    confirmed: boolean;
    clockSeconds: number | null;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseScoreRecordsRaw(
  records: any[],
  p1IsHome: boolean
): ParsedScoreState {
  // Filter for records that have a valid numeric StatusId
  const unsortedValidRecords = records.filter(
    (r) => typeof r === "object" && r !== null && typeof r.StatusId === "number"
  );

  if (unsortedValidRecords.length === 0) {
    return {
      status: "scheduled",
      statusId: 1,
      score: { home: 0, away: 0 },
      minute: null,
      events: [],
    };
  }

  // The API does NOT guarantee array order matches chronological order — a
  // pre-kickoff record (e.g. a "weather" event with Seq: 7) can appear after
  // in-progress records with far higher Seq values. Sort by Seq ascending so
  // "last element" genuinely means "most recent state".
  const validRecords = [...unsortedValidRecords].sort(
    (a, b) => (typeof a.Seq === "number" ? a.Seq : 0) - (typeof b.Seq === "number" ? b.Seq : 0)
  );

  // Override p1IsHome from records if available
  const recordWithHome = validRecords.find((r) => typeof r.Participant1IsHome === "boolean");
  if (recordWithHome) {
    p1IsHome = recordWithHome.Participant1IsHome;
  }

  // The last valid record (by Seq) is the most recent state
  const latest = validRecords[validRecords.length - 1]!;
  const statusId: number = latest.StatusId;
  const status = statusIdToStatus(statusId);

  // Not every record carries a Score block (e.g. "weather" metadata events don't) —
  // scan backward from the most recent record for the last one that actually has one.
  let p1Goals = 0;
  let p2Goals = 0;
  for (let i = validRecords.length - 1; i >= 0; i--) {
    const rec = validRecords[i]!;
    if (rec.Score) {
      p1Goals = rec.Score?.Participant1?.Total?.Goals ?? 0;
      p2Goals = rec.Score?.Participant2?.Total?.Goals ?? 0;
      break;
    }
    // Fallback: use Stats keys 1 and 2 (total goals per participant)
    if (rec.Stats && (rec.Stats["1"] !== undefined || rec.Stats["2"] !== undefined)) {
      p1Goals = rec.Stats["1"] ?? 0;
      p2Goals = rec.Stats["2"] ?? 0;
      break;
    }
  }

  const score = {
    home: p1IsHome ? p1Goals : p2Goals,
    away: p1IsHome ? p2Goals : p1Goals,
  };

  // Derive minute. Status-based checkpoints apply regardless of whether the
  // single most-recent record happens to carry Clock data (e.g. a
  // "halftime_finalised" record often doesn't) — otherwise scan backward for
  // the most recent record that does carry Clock.Seconds, same as Score above.
  let minute: number | null = null;
  if (statusId === 3) {
    minute = 45;        // Halftime
  } else if (statusId === 5) {
    minute = 90;        // Full time
  } else if (statusId === 10) {
    minute = 120;        // After ET
  } else {
    for (let i = validRecords.length - 1; i >= 0; i--) {
      const rec = validRecords[i]!;
      if (rec.Clock && typeof rec.Clock.Seconds === "number" && rec.Clock.Seconds > 0) {
        minute = Math.ceil(rec.Clock.Seconds / 60);
        break;
      }
    }
  }

  // Collect events (goals, cards) from all valid records
  const events: ParsedScoreState["events"] = [];
  for (const rec of validRecords) {
    const action = rec.Action;
    if (typeof action === "string" && ["goal", "red_card", "yellow_card"].includes(action)) {
      events.push({
        action,
        participant: typeof rec.Participant === "number" ? rec.Participant : null,
        seq: typeof rec.Seq === "number" ? rec.Seq : 0,
        confirmed: typeof rec.Confirmed === "boolean" ? rec.Confirmed : false,
        clockSeconds: typeof rec.Clock?.Seconds === "number" ? rec.Clock.Seconds : null,
      });
    }
  }

  return { status, statusId, score, minute, events };
}

// ── Odds extraction from odds record array ───────────────────────────────────

interface ParsedOdds {
  pHome: number;
  pDraw: number;
  pAway: number;
  /** true if these are in-running odds */
  inRunning: boolean;
}

function parseOddsRecords(records: z.infer<typeof OddsRecordSchema>[]): ParsedOdds | null {
  // Find the 1X2 market
  const market = records.find(r => r.SuperOddsType === "1X2_PARTICIPANT_RESULT");
  if (!market) return null;

  // Prefer the Pct array — it's already de-margined probabilities
  if (market.Pct && market.Pct.length >= 3) {
    const pHome = parseFloat(market.Pct[0]!) / 100;
    const pDraw = parseFloat(market.Pct[1]!) / 100;
    const pAway = parseFloat(market.Pct[2]!) / 100;

    if (!isNaN(pHome) && !isNaN(pDraw) && !isNaN(pAway)) {
      return { pHome, pDraw, pAway, inRunning: market.InRunning ?? false };
    }
  }

  // Fallback: convert from Prices (millicents → decimal odds → implied probability)
  if (market.Prices && market.Prices.length >= 3) {
    const oddHome = market.Prices[0]! / 1000;
    const oddDraw = market.Prices[1]! / 1000;
    const oddAway = market.Prices[2]! / 1000;

    if (oddHome > 0 && oddDraw > 0 && oddAway > 0) {
      const rawHome = 1 / oddHome;
      const rawDraw = 1 / oddDraw;
      const rawAway = 1 / oddAway;
      const total = rawHome + rawDraw + rawAway;

      return {
        pHome: rawHome / total,
        pDraw: rawDraw / total,
        pAway: rawAway / total,
        inRunning: market.InRunning ?? false,
      };
    }
  }

  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all World Cup fixture matches from TxLINE.
 * Implements FR-1.1 (PRD).
 *
 * Since the fixture endpoint's GameState is stale, we also fetch the
 * scores snapshot for each fixture that has kicked off to get the real status.
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
  const list = z.array(RawFixtureSchema).safeParse(raw);

  if (!list.success) {
    console.error(
      "[txline/adapter] listWorldCupMatches parse error:",
      list.error.flatten()
    );
    console.log("[txline/adapter] Raw response received:", JSON.stringify(raw, null, 2));
    return [];
  }

  // Filter for World Cup matches only (NG-5, PRD) — the free tier subscription
  // bundles International Friendlies too, but the product must only surface
  // the 2026 World Cup's 104 matches.
  const worldCupFixtures = list.data.filter((fixture) => {
    const comp = (fixture.Competition || "").toLowerCase();
    return comp.includes("world cup");
  });

  // For fixtures that may have kicked off, fetch scores to get real status
  const now = Date.now();
  const results: NormalisedMatch[] = [];

  for (const fixture of worldCupFixtures) {
    const kickoff = new Date(fixture.StartTime).getTime();
    const minsElapsed = (now - kickoff) / 60_000;

    // If the match has kicked off (or is within 5 mins of kickoff), probe the scores endpoint
    if (minsElapsed > -5 && minsElapsed < 300) {
      try {
        const scoreState = await fetchScoreState(String(fixture.FixtureId), fixture.Participant1IsHome, headers);
        if (scoreState) {
          results.push(normaliseMatch(fixture, scoreState.status, scoreState.score, scoreState.minute));
          continue;
        }
      } catch (err) {
        console.warn(`[txline/adapter] scores probe failed for ${fixture.FixtureId}:`, err);
      }
    }

    // Fixture hasn't kicked off or scores probe failed — use time-based inference
    results.push(normaliseMatch(fixture));
  }

  return results;
}

/**
 * Internal helper: fetch and parse the scores snapshot for a given match.
 */
async function fetchScoreState(
  matchId: string,
  p1IsHome: boolean,
  headers: HeadersInit
): Promise<ParsedScoreState | null> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/api/scores/snapshot/${matchId}`, { headers });

  if (!res.ok) {
    return null;
  }

  const raw: unknown = await res.json();
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  // Cast directly — shape confirmed from live API probe on 2026-07-10.
  // Zod was too strict for the variable record shapes in this array.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const records = raw as any[];
  return parseScoreRecordsRaw(records, p1IsHome);
}

/**
 * Returns pre-match implied probabilities for a given match.
 * Implements FR-3.2 T4 (PRD) — pPreMatch needed for full-time upset scoring.
 *
 * Uses the Pct field from the 1X2 market (already de-margined by TxLINE).
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

  if (!Array.isArray(raw)) {
    console.warn(`[txline/adapter] odds response is not an array for ${matchId}`);
    return null;
  }

  const parsed = z.array(OddsRecordSchema).safeParse(raw);
  if (!parsed.success) {
    console.warn(`[txline/adapter] odds parse error for ${matchId}:`, parsed.error.flatten());
    return null;
  }

  const odds = parseOddsRecords(parsed.data);
  if (!odds) {
    console.warn(`[txline/adapter] no 1X2 market found for ${matchId}`);
    return null;
  }

  return { pHome: odds.pHome, pDraw: odds.pDraw, pAway: odds.pAway };
}

/**
 * Returns the live score, minute, and status for a given match from TxLINE.
 * Fixed: reads the real array-of-records shape from /api/scores/snapshot.
 */
export async function getLiveMatchState(
  matchId: string
): Promise<{ score: { home: number; away: number }; minute: number | null; status: string } | null> {
  const headers = await getRequestHeaders();
  // We need Participant1IsHome to map scores correctly.
  // Fetch from fixtures first.
  const baseUrl = getBaseUrl();
  const fixRes = await fetch(`${baseUrl}/api/fixtures/snapshot`, { headers });
  let p1IsHome = true;
  if (fixRes.ok) {
    const fixtures = (await fixRes.json()) as Array<{ FixtureId: number; Participant1IsHome: boolean }>;
    const fix = fixtures.find(f => String(f.FixtureId) === matchId);
    if (fix) p1IsHome = fix.Participant1IsHome;
  }

  const state = await fetchScoreState(matchId, p1IsHome, headers);
  if (!state) return null;

  return {
    score: state.score,
    minute: state.minute,
    status: state.status,
  };
}

const scoreCache = new Map<string, { home: number; away: number }>();

/**
 * Returns the final score of a completed match.
 *
 * /api/scores/historical/{id} is the authoritative, complete record for any
 * match old enough to have one (docs: available from ~6h to 2 weeks post-
 * kickoff) — /api/scores/snapshot/{id} appears to hold only a rolling/recent
 * window of events and can be missing goals for older matches (confirmed:
 * it under-reported a finished match's score by one goal). So historical is
 * tried first; the live snapshot is only a fallback for matches finished too
 * recently (<6h) for historical data to exist yet.
 */
export async function getFinishedMatchScore(
  matchId: string
): Promise<{ home: number; away: number }> {
  const cached = scoreCache.get(matchId);
  if (cached) return cached;

  try {
    const baseUrl = getBaseUrl();
    const headers = await getRequestHeaders();

    // Try the historical endpoint first — the complete, authoritative record.
    const histRes = await fetch(`${baseUrl}/api/scores/historical/${matchId}`, { headers });
    if (histRes.ok) {
      const text = await histRes.text();
      const lines = text.split("\n");

      // Scan backward for the last record that actually carries Stats.
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]!.trim();
        if (!line.startsWith("data: ")) continue;

        try {
          const parsed = JSON.parse(line.slice(6)) as {
            Participant1IsHome?: boolean;
            Stats?: Record<string, number>;
          };
          const stats = parsed.Stats;
          if (!stats || (stats["1"] === undefined && stats["2"] === undefined)) continue;

          const isHome = parsed.Participant1IsHome ?? true;
          const val1 = stats["1"] ?? 0;
          const val2 = stats["2"] ?? 0;
          const score = {
            home: isHome ? val1 : val2,
            away: isHome ? val2 : val1,
          };

          scoreCache.set(matchId, score);
          return score;
        } catch {
          continue; // malformed line — keep scanning backward
        }
      }
    }

    // Fallback: live scores snapshot (historical not populated yet — match
    // finished less than ~6h ago per TxLINE docs).
    const snapshotRes = await fetch(`${baseUrl}/api/scores/snapshot/${matchId}`, { headers });
    if (snapshotRes.ok) {
      const raw: unknown = await snapshotRes.json();
      if (Array.isArray(raw) && raw.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstWithHome = (raw as any[]).find((r: any) => typeof r.Participant1IsHome === "boolean");
        const p1IsHome = firstWithHome?.Participant1IsHome ?? true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = parseScoreRecordsRaw(raw as any[], p1IsHome);
        if (state.score.home > 0 || state.score.away > 0) {
          scoreCache.set(matchId, state.score);
          return state.score;
        }
      }
    }
  } catch (err) {
    console.error(
      `[txline/adapter] getFinishedMatchScore error for ${matchId}:`,
      err
    );
  }

  return { home: 0, away: 0 };
}

/**
 * Subscribes to live odds + event updates for a match.
 * Implements FR-3.1 (PRD) — poll every 30s.
 *
 * Fixed: reads real array-of-records score shape and array-of-markets odds shape.
 * Returns an unsubscribe function.
 */
export function subscribeMatch(
  matchId: string,
  onTick: OddsTickCallback,
  onEvent: MatchEventCallback
): UnsubscribeFn {
  const intervalMs = 30_000; // Poll every 30 seconds

  let lastHomeScore = 0;
  let lastAwayScore = 0;
  let lastSeenSeq = 0; // Track which score records we've already processed
  let hasKickoffFired = false;
  let p1IsHome = true; // will be set from the first score record
  // Matches are often tracked mid-progress (worker restarted, or a witness
  // checks in after kickoff). Without this, the first poll would treat every
  // goal/card that already happened earlier in the match as brand-new —
  // misattributed to the current minute and double-counted into the score.
  let isFirstPoll = true;

  const poll = async () => {
    try {
      const headers = await getRequestHeaders();
      const baseUrl = getBaseUrl();

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

      // ── Parse Scores ──────────────────────────────────────────────

      const scoreRaw: unknown = await scoreRes.json();
      if (!Array.isArray(scoreRaw) || scoreRaw.length === 0) {
        return; // No score data yet
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = parseScoreRecordsRaw(scoreRaw as any[], p1IsHome);

      // Update p1IsHome from the first record with that field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const homeRec = (scoreRaw as any[]).find((r: any) => typeof r.Participant1IsHome === "boolean");
      if (homeRec) p1IsHome = homeRec.Participant1IsHome;

      // ── Parse Odds ────────────────────────────────────────────────

      const oddsRaw: unknown = await oddsRes.json();
      if (Array.isArray(oddsRaw)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const market = (oddsRaw as any[]).find((r: any) => r.SuperOddsType === "1X2_PARTICIPANT_RESULT");
        if (market && market.Pct && market.Pct.length >= 3) {
          const pHome = parseFloat(market.Pct[0]) / 100;
          const pDraw = parseFloat(market.Pct[1]) / 100;
          const pAway = parseFloat(market.Pct[2]) / 100;
          if (!isNaN(pHome) && !isNaN(pDraw) && !isNaN(pAway)) {
            onTick({
              matchId,
              atUtc: new Date().toISOString(),
              pHome,
              pDraw,
              pAway,
            });
          }
        }
      }

      // ── Synthesize events from score state ────────────────────────

      const currentMinute = state.minute ?? 0;

      // Synthesize Kickoff — only meaningful the first time we see a live
      // status; if the match is already live on our first poll (tracking
      // started mid-match), treat kickoff as already having happened.
      const isCurrentlyLive = [2, 3, 4, 6, 7, 8, 9, 11, 12].includes(state.statusId);
      if (!hasKickoffFired && isCurrentlyLive) {
        hasKickoffFired = true;
        if (!isFirstPoll) {
          onEvent({
            matchId,
            atUtc: new Date().toISOString(),
            minute: currentMinute || 1,
            kind: "kickoff",
            team: null,
          });
        }
      }

      if (isFirstPoll) {
        // Establish a baseline instead of replaying the match's entire event
        // history as if it were happening now.
        for (const evt of state.events) {
          if (evt.seq > lastSeenSeq) lastSeenSeq = evt.seq;
        }
        lastHomeScore = state.score.home;
        lastAwayScore = state.score.away;
        isFirstPoll = false;
      } else {
        // Process new events (goal, red_card) — only those with seq > lastSeenSeq
        let homeGoalFiredThisPoll = false;
        let awayGoalFiredThisPoll = false;

        for (const evt of state.events) {
          if (evt.seq <= lastSeenSeq) continue;
          lastSeenSeq = evt.seq;

          if (evt.action === "goal" && evt.confirmed !== false) {
            // Determine which team scored
            const team: "home" | "away" =
              (evt.participant === 1 && p1IsHome) || (evt.participant === 2 && !p1IsHome)
                ? "home"
                : "away";

            if (team === "home") homeGoalFiredThisPoll = true;
            else awayGoalFiredThisPoll = true;

            onEvent({
              matchId,
              atUtc: new Date().toISOString(),
              minute: evt.clockSeconds ? Math.ceil(evt.clockSeconds / 60) : currentMinute,
              kind: "goal",
              team,
            });
          }

          if (evt.action === "red_card" && evt.confirmed !== false) {
            const team: "home" | "away" =
              (evt.participant === 1 && p1IsHome) || (evt.participant === 2 && !p1IsHome)
                ? "home"
                : "away";

            onEvent({
              matchId,
              atUtc: new Date().toISOString(),
              minute: evt.clockSeconds ? Math.ceil(evt.clockSeconds / 60) : currentMinute,
              kind: "red_card",
              team,
            });
          }
        }

        // Fallback goal detection via score-diff (in case Action events are missed).
        // Only fires if the events loop above did NOT already emit a goal for that
        // side this poll — tracked directly via the flags, not inferred from seq math.
        if (state.score.home > lastHomeScore && !homeGoalFiredThisPoll) {
          onEvent({
            matchId,
            atUtc: new Date().toISOString(),
            minute: currentMinute,
            kind: "goal",
            team: "home",
          });
        }
        if (state.score.away > lastAwayScore && !awayGoalFiredThisPoll) {
          onEvent({
            matchId,
            atUtc: new Date().toISOString(),
            minute: currentMinute,
            kind: "goal",
            team: "away",
          });
        }

        lastHomeScore = state.score.home;
        lastAwayScore = state.score.away;
      }

      // Synthesize Full Time
      if ([5, 10, 13].includes(state.statusId)) {
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
