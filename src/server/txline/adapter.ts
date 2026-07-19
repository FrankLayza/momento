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
  TimelineEvent,
  MatchLineups,
  LineupPlayer,
  TeamLineup,
  MatchStats,
  TeamStats,
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

function statusIdToPhase(statusId: number): NormalisedMatch["phase"] {
  switch (statusId) {
    case 2: return "H1";
    case 3: return "HT";
    case 4: return "H2";
    case 5: return "FT";
    case 7: return "ET1";
    case 9: return "ET2";
    case 11: case 12: return "PEN";
    default: return null;
  }
}

function normaliseMatch(
  raw: z.infer<typeof RawFixtureSchema>,
  liveStatus?: NormalisedMatch["status"],
  liveScore?: { home: number; away: number },
  liveMinute?: number | null,
  livePhase?: NormalisedMatch["phase"]
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
    phase: livePhase ?? null,
    competition: raw.Competition ?? undefined,
  };
}

// ── Score extraction from a score record array ───────────────────────────────

interface ParsedScoreState {
  status: NormalisedMatch["status"];
  statusId: number;
  phase: NormalisedMatch["phase"];
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
      phase: null,
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

  return { status, statusId, phase: statusIdToPhase(statusId), score, minute, events };
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
  //
  // INCLUDE_FRIENDLIES=true opts the friendlies bundle back in. Off by default
  // to stay NG-5 compliant; useful when no World Cup fixture is live/upcoming
  // and you need real feed data to exercise the loop.
  const includeFriendlies = process.env.INCLUDE_FRIENDLIES !== "false";
  const worldCupFixtures = list.data.filter((fixture) => {
    const comp = (fixture.Competition || "").toLowerCase();
    if (comp.includes("world cup")) return true;
    return includeFriendlies && comp.includes("friendlies");
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
          results.push(normaliseMatch(fixture, scoreState.status, scoreState.score, scoreState.minute, scoreState.phase));
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
): Promise<{ score: { home: number; away: number }; minute: number | null; status: string; phase: NormalisedMatch["phase"] } | null> {
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
    phase: state.phase,
  };
}

function parseSse(text: string): any[] {
  const out: any[] = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const dl = block.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(l.indexOf(":")+1).trim());
    if (!dl.length) continue;
    try {
      out.push(JSON.parse(dl.join("\n")));
    } catch {
      for (const line of dl) {
        try { out.push(JSON.parse(line)); } catch {}
      }
    }
  }
  return out;
}

const scoreCache = new Map<string, { home: number; away: number }>();

/**
 * Returns the final score of a completed match.
 */
export async function getFinishedMatchScore(
  matchId: string
): Promise<{ home: number; away: number }> {
  const cached = scoreCache.get(matchId);
  if (cached) return cached;

  try {
    const records = await fetchMatchRecords(matchId);
    if (records.length > 0) {
      const lastWithScore = [...records].reverse().find(
        (r) => r.Score || (r.Stats && (r.Stats["1"] !== undefined || r.Stats["2"] !== undefined))
      );
      if (lastWithScore) {
        const p1IsHome = lastWithScore.Participant1IsHome ?? true;
        let home = 0;
        let away = 0;
        if (lastWithScore.Score) {
          const g1 = lastWithScore.Score?.Participant1?.Total?.Goals ?? 0;
          const g2 = lastWithScore.Score?.Participant2?.Total?.Goals ?? 0;
          home = p1IsHome ? g1 : g2;
          away = p1IsHome ? g2 : g1;
        } else if (lastWithScore.Stats) {
          const g1 = lastWithScore.Stats["1"] ?? 0;
          const g2 = lastWithScore.Stats["2"] ?? 0;
          home = p1IsHome ? g1 : g2;
          away = p1IsHome ? g2 : g1;
        }
        const score = { home, away };
        scoreCache.set(matchId, score);
        return score;
      }
    }
  } catch (err) {
    console.error(`[txline/adapter] getFinishedMatchScore error for ${matchId}:`, err);
  }

  return { home: 0, away: 0 };
}

/**
 * Reconstructs a match's goal/card timeline from TxLINE's scores feed.
 */
export async function getMatchTimeline(matchId: string): Promise<TimelineEvent[]> {
  try {
    const records = await fetchMatchRecords(matchId);
    if (records.length === 0) return [];

    // The feed doesn't guarantee array order — sort by Seq so deltas are chronological.
    const sorted = records
      .filter((r) => r && (typeof r.StatusId === "number" || r.Score || r.Stats))
      .sort((a, b) => (typeof a.Seq === "number" ? a.Seq : 0) - (typeof b.Seq === "number" ? b.Seq : 0));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homeRec = sorted.find((r) => typeof r.Participant1IsHome === "boolean");
    const p1IsHome: boolean = homeRec?.Participant1IsHome ?? true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function minuteOf(rec: any): number {
      const secs = rec.Clock?.Seconds;
      if (typeof secs === "number" && secs > 0) return Math.ceil(secs / 60);
      if (rec.StatusId === 3) return 45;
      if (rec.StatusId === 5) return 90;
      if (rec.StatusId === 10) return 120;
      return 0;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function phaseOf(rec: any): NormalisedMatch["phase"] {
      return statusIdToPhase(rec.StatusId);
    }

    const events: TimelineEvent[] = [];
    let g1 = 0, g2 = 0, y1 = 0, y2 = 0, r1 = 0, r2 = 0;

    const teamOf = (participant: 1 | 2): "home" | "away" =>
      (participant === 1) === p1IsHome ? "home" : "away";
    const score = () => ({
      scoreHome: p1IsHome ? g1 : g2,
      scoreAway: p1IsHome ? g2 : g1,
    });

    for (const rec of sorted) {
      const minute = minuteOf(rec);
      const phase = phaseOf(rec);

      // Emit one event per unit increase (not per delta) so a stream gap that
      // jumps the count by >1 still yields the right number of goals/cards.
      const ng1 = rec.Score?.Participant1?.Total?.Goals;
      const ng2 = rec.Score?.Participant2?.Total?.Goals;
      while (typeof ng1 === "number" && ng1 > g1) { g1++; events.push({ minute, kind: "goal", team: teamOf(1), phase, ...score() }); }
      while (typeof ng2 === "number" && ng2 > g2) { g2++; events.push({ minute, kind: "goal", team: teamOf(2), phase, ...score() }); }

      const st = rec.Stats;
      if (st) {
        while (typeof st["3"] === "number" && st["3"] > y1) { y1++; events.push({ minute, kind: "yellow_card", team: teamOf(1), phase, ...score() }); }
        while (typeof st["4"] === "number" && st["4"] > y2) { y2++; events.push({ minute, kind: "yellow_card", team: teamOf(2), phase, ...score() }); }
        while (typeof st["5"] === "number" && st["5"] > r1) { r1++; events.push({ minute, kind: "red_card", team: teamOf(1), phase, ...score() }); }
        while (typeof st["6"] === "number" && st["6"] > r2) { r2++; events.push({ minute, kind: "red_card", team: teamOf(2), phase, ...score() }); }
      }
    }

    // Discrete action rows (substitutions, penalties, VAR) carry no cumulative
    // stat. The feed emits each one several times (unconfirmed then confirmed),
    // so dedupe by the stable per-event Id, preferring a confirmed copy.
    type DiscreteKind = "substitution" | "penalty" | "var";
    const ACTION_KIND: Record<string, DiscreteKind> = {
      substitution: "substitution",
      penalty: "penalty",
      var: "var",
    };
    const discreteById = new Map<
      string,
      { kind: DiscreteKind; minute: number; participant: 1 | 2 | null; confirmed: boolean; phase: NormalisedMatch["phase"] }
    >();
    for (const rec of sorted) {
      const kind = ACTION_KIND[rec.Action];
      if (!kind) continue;
      const id = typeof rec.Id === "number" ? rec.Id : null;
      if (id === null) continue;
      const rawP = rec.Data?.Participant ?? rec.Participant;
      const participant = rawP === 1 || rawP === 2 ? (rawP as 1 | 2) : null;
      const confirmed = rec.Confirmed === true;
      const key = `${kind}:${id}`;
      const existing = discreteById.get(key);
      if (!existing || (confirmed && !existing.confirmed)) {
        discreteById.set(key, { kind, minute: minuteOf(rec), participant, confirmed, phase: phaseOf(rec) });
      }
    }
    // Running score at a given minute, so these rows can still show the scoreline.
    const goalEvents = events.filter((e) => e.kind === "goal");
    const scoreAtMinute = (minute: number) => {
      const before = goalEvents.filter((e) => e.minute <= minute);
      const last = before[before.length - 1];
      return last
          ? { scoreHome: last.scoreHome, scoreAway: last.scoreAway }
          : { scoreHome: 0, scoreAway: 0 };
    };
    for (const d of discreteById.values()) {
      events.push({
        minute: d.minute,
        kind: d.kind,
        team: d.participant ? teamOf(d.participant) : null,
        phase: d.phase,
        ...scoreAtMinute(d.minute),
      });
    }

    const PHASE_ORDER: Record<string, number> = {
      H1: 1,
      HT: 2,
      H2: 3,
      FT: 4,
      ET1: 5,
      ET2: 6,
      PEN: 7,
    };

    // Stable sort: sort first by phase chronology, then by minute within the phase, keeping insertion order as fallback.
    return events
      .map((e, i) => ({ e, i }))
      .sort((a, b) => {
        const orderA = a.e.phase ? (PHASE_ORDER[a.e.phase] ?? 99) : 99;
        const orderB = b.e.phase ? (PHASE_ORDER[b.e.phase] ?? 99) : 99;
        if (orderA !== orderB) return orderA - orderB;
        return a.e.minute - b.e.minute || a.i - b.i;
      })
      .map(({ e }) => e);
  } catch (err) {
    console.error(`[txline/adapter] getMatchTimeline error for ${matchId}:`, err);
    return [];
  }
}

// ── Lineups ───────────────────────────────────────────────────────────────────

const POSITION_MAP: Record<number, LineupPlayer["position"]> = {
  34: "G",
  35: "D",
  36: "M",
  37: "F",
};

/** TxLINE names are "Last, First" — render as "First Last". */
function formatPlayerName(raw: string): string {
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length === 2 && parts[1]) return `${parts[1]} ${parts[0]}`;
  return raw.trim();
}

function deriveFormation(startXI: LineupPlayer[]): string | null {
  const def = startXI.filter((p) => p.position === "D").length;
  const mid = startXI.filter((p) => p.position === "M").length;
  const fwd = startXI.filter((p) => p.position === "F").length;
  if (def + mid + fwd === 0) return null;
  return `${def}-${mid}-${fwd}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseTeamLineup(raw: any): TeamLineup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const players: LineupPlayer[] = (raw?.lineups ?? []).map((entry: any) => ({
    number: parseInt(entry.rosterNumber, 10) || 0,
    name: formatPlayerName(entry.player?.preferredName ?? ""),
    position: POSITION_MAP[entry.positionId as number] ?? null,
    starter: entry.starter === true,
  }));
  const startXI = players.filter((p) => p.starter);
  const bench = players.filter((p) => !p.starter);
  return {
    teamName: raw?.preferredName ?? "",
    formation: deriveFormation(startXI),
    startXI,
    bench,
  };
}

/**
 * Returns the confirmed starting XIs + bench for a match, parsed from TxLINE's
 * `lineups` action record. Availability depends on coverage (CoverageType
 * "TV/Stream" carries it) — returns null when the fixture has no lineup record.
 */
export async function getMatchLineups(matchId: string): Promise<MatchLineups | null> {
  try {
    const baseUrl = getBaseUrl();
    const headers = await getRequestHeaders();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lineupRec: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let anyRec: any = null;

    // Historical first — the complete record carries the lineups action.
    const histRes = await fetch(`${baseUrl}/api/scores/historical/${matchId}`, { headers });
    if (histRes.ok) {
      const text = await histRes.text();
      for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const rec = JSON.parse(line.slice(line.indexOf(":") + 1).trim());
          anyRec = rec;
          // Keep the last lineups record (rosters can be amended pre-kickoff).
          if (rec.Action === "lineups" && Array.isArray(rec.Lineups) && rec.Lineups.length >= 2) {
            lineupRec = rec;
          }
        } catch {
          // skip malformed line
        }
      }
    }

    // Fallback: live snapshot for matches too recent for historical.
    if (!lineupRec) {
      const snapRes = await fetch(`${baseUrl}/api/scores/snapshot/${matchId}`, { headers });
      if (snapRes.ok) {
        const raw: unknown = await snapRes.json();
        if (Array.isArray(raw)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const rec of raw as any[]) {
            anyRec = rec;
            if (rec.Action === "lineups" && Array.isArray(rec.Lineups) && rec.Lineups.length >= 2) {
              lineupRec = rec;
            }
          }
        }
      }
    }

    if (!lineupRec) return null;

    const p1IsHome: boolean =
      typeof lineupRec.Participant1IsHome === "boolean"
        ? lineupRec.Participant1IsHome
        : anyRec?.Participant1IsHome ?? true;
    const p1Id: number | undefined = lineupRec.Participant1Id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teams = lineupRec.Lineups as any[];
    const team1 = teams.find((t) => t.normativeId === p1Id) ?? teams[0];
    const team2 = teams.find((t) => t !== team1) ?? teams[1];

    const lineup1 = normaliseTeamLineup(team1);
    const lineup2 = normaliseTeamLineup(team2);

    return p1IsHome
      ? { home: lineup1, away: lineup2 }
      : { home: lineup2, away: lineup1 };
  } catch (err) {
    console.error(`[txline/adapter] getMatchLineups error for ${matchId}:`, err);
    return null;
  }
}

// ── Match stats ───────────────────────────────────────────────────────────────

/**
 * Fetches a match's raw score records (historical SSE first, snapshot fallback).
 * Shared by the stats/timeline readers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchMatchRecords(matchId: string): Promise<any[]> {
  const baseUrl = getBaseUrl();
  const headers = await getRequestHeaders();

  // 1. Try historical endpoint first (for older finished matches)
  try {
    const histRes = await fetch(`${baseUrl}/api/scores/historical/${matchId}`, { headers });
    if (histRes.ok) {
      const text = await histRes.text();
      if (text.trim().length > 0) {
        const records = parseSse(text);
        if (records.length > 0) return records;
      }
    }
  } catch (e) {
    console.warn(`[txline/adapter] historical fetch failed for ${matchId}:`, e);
  }

  // 2. Try updates endpoint (SSE updates stream) for live matches
  try {
    const updatesRes = await fetch(`${baseUrl}/api/scores/updates/${matchId}`, { headers });
    if (updatesRes.ok) {
      const text = await updatesRes.text();
      if (text.trim().length > 0) {
        const records = parseSse(text);
        if (records.length > 0) return records;
      }
    }
  } catch (e) {
    console.warn(`[txline/adapter] updates fetch failed for ${matchId}:`, e);
  }

  // 3. Fallback: Try snapshot endpoint
  try {
    const snapRes = await fetch(`${baseUrl}/api/scores/snapshot/${matchId}`, { headers });
    if (snapRes.ok) {
      const raw = await snapRes.json();
      if (Array.isArray(raw)) return raw;
    }
  } catch (e) {
    console.warn(`[txline/adapter] snapshot fetch failed for ${matchId}:`, e);
  }

  return [];
}

const EMPTY_TEAM_STATS: TeamStats = {
  possession: 0, shots: 0, corners: 0, freeKicks: 0,
  throwIns: 0, offsides: 0, yellowCards: 0, redCards: 0, penalties: 0,
};

/**
 * Counts team-level match stats from TxLINE's scores feed:
 *   - corners + cards from the cumulative Stats block (keys 3–8),
 *   - shots / free kicks / throw-ins / offsides / penalties from deduped action
 *     rows (each event is emitted several times; dedupe by Id),
 *   - possession as each side's share of possession-phase events.
 * Returns null when the fixture has no usable records.
 */
export async function getMatchStats(matchId: string): Promise<MatchStats | null> {
  try {
    const records = await fetchMatchRecords(matchId);
    if (records.length === 0) return null;

    const home = { ...EMPTY_TEAM_STATS };
    const away = { ...EMPTY_TEAM_STATS };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const homeRec = records.find((r) => typeof r.Participant1IsHome === "boolean");
    const p1IsHome: boolean = homeRec?.Participant1IsHome ?? true;
    const sideOf = (participant: 1 | 2) =>
      (participant === 1) === p1IsHome ? home : away;

    // Deduped discrete-action counts (shots, free kicks, throw-ins, offsides, penalties).
    const countedIds = new Set<string>();
    const bump = (
      participant: unknown,
      field: keyof TeamStats,
      id: unknown,
      action: string
    ) => {
      if ((participant !== 1 && participant !== 2) || typeof id !== "number") return;
      const key = `${action}:${id}`;
      if (countedIds.has(key)) return;
      countedIds.add(key);
      sideOf(participant)[field] += 1;
    };

    // Possession share and attack momentum over time.
    let posHome = 0, posAway = 0;
    const POSSESSION_WEIGHTS: Record<string, number> = {
      possession: 10,
      safe_possession: 10,
      attack_possession: 20,
      danger_possession: 30,
      high_danger_possession: 50,
    };

    const momentumByMinute = new Map<number, { home: number, away: number }>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getMinute(rec: any): number {
      const secs = rec.Clock?.Seconds;
      if (typeof secs === "number" && secs > 0) return Math.ceil(secs / 60);
      // Phase-derived fallbacks: use the StatusId to infer which half the event
      // belongs to rather than dropping to 0 (which silently discards the event
      // from the momentum chart).
      if (rec.StatusId === 2) return 22;  // H1 → mid first-half estimate
      if (rec.StatusId === 3) return 45;  // HT
      if (rec.StatusId === 4) return 67;  // H2 → mid second-half estimate
      if (rec.StatusId === 5) return 90;  // FT
      if (rec.StatusId === 7) return 97;  // ET H1
      if (rec.StatusId === 9) return 112; // ET H2
      if (rec.StatusId === 10) return 120; // AET
      return 0;
    }

    for (const rec of records) {
      const action: string = rec.Action;
      const p = rec.Data?.Participant ?? rec.Participant;

      if (action === "shot") bump(p, "shots", rec.Id, action);
      else if (action === "free_kick") bump(p, "freeKicks", rec.Id, action);
      else if (action === "throw_in") bump(p, "throwIns", rec.Id, action);
      else if (action === "offside") bump(p, "offsides", rec.Id, action);
      else if (action === "penalty") bump(p, "penalties", rec.Id, action);
      else if (action in POSSESSION_WEIGHTS) {
        if (p === 1) (p1IsHome ? posHome++ : posAway++);
        else if (p === 2) (p1IsHome ? posAway++ : posHome++);
        
        const weight = POSSESSION_WEIGHTS[action]!;
        const minute = getMinute(rec);
        if (minute > 0 && (p === 1 || p === 2)) {
           const existing = momentumByMinute.get(minute) ?? { home: 0, away: 0 };
           if (p === 1) {
             p1IsHome ? existing.home += weight : existing.away += weight;
           } else {
             p1IsHome ? existing.away += weight : existing.home += weight;
           }
           momentumByMinute.set(minute, existing);
        }
      }
    }

    // Corners + cards from the last record carrying the cumulative Stats block.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastStats = [...records].reverse().find((r) => r.Stats && r.Stats["7"] !== undefined);
    if (lastStats) {
      const s = lastStats.Stats;
      const p1 = { yellowCards: s["3"] ?? 0, redCards: s["5"] ?? 0, corners: s["7"] ?? 0 };
      const p2 = { yellowCards: s["4"] ?? 0, redCards: s["6"] ?? 0, corners: s["8"] ?? 0 };
      Object.assign(p1IsHome ? home : away, p1);
      Object.assign(p1IsHome ? away : home, p2);
    }

    const posTotal = posHome + posAway;
    if (posTotal > 0) {
      home.possession = Math.round((posHome / posTotal) * 100);
      away.possession = 100 - home.possession;
    }

    const momentum: MatchStats["momentum"] = [];
    if (momentumByMinute.size > 0) {
      const maxMinute = Math.max(...Array.from(momentumByMinute.keys()), 90);
      for (let m = 1; m <= maxMinute; m++) {
         const vals = momentumByMinute.get(m);
         if (!vals) {
            momentum.push({ minute: m, value: 0 });
         } else {
            // positive value means home dominance, negative means away dominance
            momentum.push({ minute: m, value: vals.home - vals.away });
         }
      }
    }

    return { home, away, momentum };
  } catch (err) {
    console.error(`[txline/adapter] getMatchStats error for ${matchId}:`, err);
    return null;
  }
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
  // Full time is a terminal status (5/10/13) that persists across every
  // subsequent poll — without a fired-once guard the recorder re-emits a
  // full_time event on every 30s poll after the match ends (observed: 18
  // duplicate full_time events in a single recording).
  let hasFullTimeFired = false;
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

      // Synthesize Full Time — once only (see hasFullTimeFired above).
      if (!hasFullTimeFired && [5, 10, 13].includes(state.statusId)) {
        hasFullTimeFired = true;
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
