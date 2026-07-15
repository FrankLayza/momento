/**
 * scripts/synthesize-replay.ts
 * Generates a replay fixture file from a finished match's TxLINE historical data.
 *
 * Usage:
 *   pnpm synthesize:replay --matchId <TXLINE_MATCH_ID>
 *
 * Output: fixtures/replay/<matchId>.jsonl
 *
 * How it works:
 *   1. Fetches the fixture metadata from /api/fixtures/snapshot to get team names.
 *   2. Fetches /api/scores/historical/{id} (SSE format) — complete event record.
 *   3. Fetches /api/odds/snapshot/{id} for pre-match odds (a single snapshot).
 *   4. Reconstructs a timeline of tick + event lines from the historical data.
 *   5. Writes the JSONL file that replay.ts can stream.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import tls from "node:tls";
import dns from "node:dns";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Force IPv4 first (same as adapter.ts)
dns.setDefaultResultOrder("ipv4first");
// Cap TLS to 1.2 (same as adapter.ts — avoids TLS 1.3 handshake stall)
tls.DEFAULT_MAX_VERSION = "TLSv1.2";

// ── Config ────────────────────────────────────────────────────────────────────

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL;
const TXLINE_API_KEY = process.env.TXLINE_API_KEY;

if (!TXLINE_BASE_URL) {
  console.error("Missing TXLINE_BASE_URL in .env.local");
  process.exit(1);
}
if (!TXLINE_API_KEY) {
  console.error("Missing TXLINE_API_KEY in .env.local");
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.cwd(), "fixtures", "replay");

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const matchIdIdx = args.indexOf("--matchId");
const matchId = matchIdIdx >= 0 ? args[matchIdIdx + 1] : undefined;

if (!matchId) {
  console.error("Usage: pnpm synthesize:replay --matchId <TXLINE_MATCH_ID>");
  process.exit(1);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getGuestJwt(): Promise<string> {
  const res = await fetch(`${TXLINE_BASE_URL}/auth/guest/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Guest JWT failed: ${res.status}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

async function getHeaders(): Promise<HeadersInit> {
  const jwt = await getGuestJwt();
  return {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": TXLINE_API_KEY!,
    "Content-Type": "application/json",
  };
}

// ── Fixture metadata ──────────────────────────────────────────────────────────

interface FixtureMeta {
  home: string;
  away: string;
  startUtc: string;
  p1IsHome: boolean;
}

async function getFixtureMeta(headers: HeadersInit): Promise<FixtureMeta | null> {
  const res = await fetch(`${TXLINE_BASE_URL}/api/fixtures/snapshot`, { headers });
  if (!res.ok) {
    console.warn(`[synthesize] Fixtures endpoint failed: ${res.status}`);
  } else {
    const fixtures = (await res.json()) as Array<{
      FixtureId: number;
      Participant1: string;
      Participant2: string;
      Participant1IsHome: boolean;
      StartTime: number;
    }>;

    const fix = fixtures.find((f) => String(f.FixtureId) === matchId);
    if (fix) {
      return {
        home: fix.Participant1IsHome ? fix.Participant1 : fix.Participant2,
        away: fix.Participant1IsHome ? fix.Participant2 : fix.Participant1,
        startUtc: new Date(fix.StartTime).toISOString(),
        p1IsHome: fix.Participant1IsHome,
      };
    }
  }

  // Fallback: Check local database if the match is too old for the snapshot
  console.log(`[synthesize] Match ${matchId} not in live TxLINE snapshot. Checking local database...`);
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (SUPABASE_URL && SUPABASE_KEY) {
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });
    if (sbRes.ok) {
      const data = await sbRes.json();
      if (data && data.length > 0) {
        const match = data[0];
        console.log(`[synthesize] Found match in local DB: ${match.home} v ${match.away}`);
        // We guess p1IsHome=true as a default since DB doesn't store Participant1IsHome
        return {
          home: match.home,
          away: match.away,
          startUtc: match.kickoff_utc,
          p1IsHome: true, 
        };
      }
    }
  }

  return null;
}

// ── Odds snapshot ─────────────────────────────────────────────────────────────

async function getPreMatchOdds(
  headers: HeadersInit
): Promise<{ pHome: number; pDraw: number; pAway: number } | null> {
  const res = await fetch(`${TXLINE_BASE_URL}/api/odds/snapshot/${matchId}`, { headers });
  if (!res.ok) return null;

  const raw = (await res.json()) as Array<{
    SuperOddsType: string;
    Pct?: string[];
    Prices?: number[];
  }>;

  const market = raw.find((r) => r.SuperOddsType === "1X2_PARTICIPANT_RESULT");
  if (!market) return null;

  if (market.Pct && market.Pct.length >= 3) {
    const pHome = parseFloat(market.Pct[0]!) / 100;
    const pDraw = parseFloat(market.Pct[1]!) / 100;
    const pAway = parseFloat(market.Pct[2]!) / 100;
    if (!isNaN(pHome) && !isNaN(pDraw) && !isNaN(pAway)) {
      return { pHome, pDraw, pAway };
    }
  }

  if (market.Prices && market.Prices.length >= 3) {
    const o1 = market.Prices[0]! / 1000;
    const o2 = market.Prices[1]! / 1000;
    const o3 = market.Prices[2]! / 1000;
    if (o1 > 0 && o2 > 0 && o3 > 0) {
      const total = 1 / o1 + 1 / o2 + 1 / o3;
      return {
        pHome: 1 / o1 / total,
        pDraw: 1 / o2 / total,
        pAway: 1 / o3 / total,
      };
    }
  }

  return null;
}

// ── Historical scores ─────────────────────────────────────────────────────────

interface HistoricalRecord {
  StatusId?: number;
  Clock?: { Running?: boolean; Seconds?: number };
  Score?: {
    Participant1?: { Total?: { Goals?: number } };
    Participant2?: { Total?: { Goals?: number } };
  };
  Stats?: Record<string, number>;
  Action?: string;
  Participant?: number;
  Confirmed?: boolean;
  Seq?: number;
  Ts?: number;
  Participant1IsHome?: boolean;
}

async function getHistoricalRecords(headers: HeadersInit): Promise<HistoricalRecord[]> {
  // Try historical first — complete record
  const histRes = await fetch(`${TXLINE_BASE_URL}/api/scores/historical/${matchId}`, { headers });
  if (histRes.ok) {
    const text = await histRes.text();
    const records: HistoricalRecord[] = [];
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      try {
        records.push(JSON.parse(line.slice(line.indexOf(":") + 1).trim()));
      } catch {
        // skip malformed line
      }
    }
    if (records.length > 0) {
      console.log(`[synthesize] Found ${records.length} historical records`);
      return records;
    }
  }

  // Fallback: live snapshot
  console.log("[synthesize] No historical data, falling back to scores/snapshot");
  const snapRes = await fetch(`${TXLINE_BASE_URL}/api/scores/snapshot/${matchId}`, { headers });
  if (!snapRes.ok) return [];

  const raw = (await snapRes.json()) as HistoricalRecord[];
  if (!Array.isArray(raw)) return [];
  console.log(`[synthesize] Found ${raw.length} snapshot records`);
  return raw;
}

// ── JSONL synthesis ───────────────────────────────────────────────────────────

interface JLine {
  type: "meta" | "tick" | "event";
  [key: string]: unknown;
}

function synthesize(
  meta: FixtureMeta,
  odds: { pHome: number; pDraw: number; pAway: number } | null,
  records: HistoricalRecord[]
): JLine[] {
  const lines: JLine[] = [];
  const kickoff = new Date(meta.startUtc);

  // 1. Meta line
  lines.push({
    type: "meta",
    matchId: matchId!,
    home: meta.home,
    away: meta.away,
    startUtc: meta.startUtc,
  });

  // Determine p1IsHome from records if available
  let p1IsHome = meta.p1IsHome;
  const homeRec = records.find((r) => typeof r.Participant1IsHome === "boolean");
  if (homeRec) p1IsHome = homeRec.Participant1IsHome!;

  // Sort records by Seq
  const sorted = [...records]
    .filter((r) => typeof r.StatusId === "number" || r.Score || r.Stats || r.Action)
    .sort((a, b) => (a.Seq ?? 0) - (b.Seq ?? 0));

  if (sorted.length === 0) {
    console.warn("[synthesize] No valid records found — output will have only meta + odds.");
    if (odds) {
      lines.push({
        type: "tick",
        data: {
          matchId: matchId!,
          atUtc: kickoff.toISOString(),
          pHome: odds.pHome,
          pDraw: odds.pDraw,
          pAway: odds.pAway,
        },
      });
    }
    return lines;
  }

  // 2. Pre-match odds tick (before kickoff)
  if (odds) {
    lines.push({
      type: "tick",
      data: {
        matchId: matchId!,
        atUtc: new Date(kickoff.getTime() - 60_000).toISOString(),
        pHome: odds.pHome,
        pDraw: odds.pDraw,
        pAway: odds.pAway,
      },
    });
  }

  // 3. Kickoff event
  lines.push({
    type: "event",
    data: {
      matchId: matchId!,
      atUtc: kickoff.toISOString(),
      minute: 1,
      kind: "kickoff",
      team: null,
    },
  });

  // 4. Walk through records: emit goals, red cards, and periodic odds ticks.
  // We don't have historical odds snapshots per-minute — so we simulate odds
  // changes by deriving implied probabilities from the score progression.
  // This is a simplification: the real odds would shift with market sentiment,
  // but for replay demo purposes, synthesised shifts from score changes
  // (which are the main Moment triggers) are sufficient.

  let g1 = 0; // participant 1 goals
  let g2 = 0; // participant 2 goals
  let r1 = 0; // participant 1 reds
  let r2 = 0; // participant 2 reds
  let lastTickMinute = 0;

  const baseOdds = odds ?? { pHome: 0.33, pDraw: 0.34, pAway: 0.33 };

  // Simulate odds: after each goal, shift probabilities significantly
  function synthesiseOdds(homeGoals: number, awayGoals: number, minute: number) {
    const diff = homeGoals - awayGoals;
    const lateBonus = Math.min(1, minute / 90); // later = more decisive

    // Shift home probability based on goal diff and time
    let pH = baseOdds.pHome + diff * 0.15 * (0.5 + 0.5 * lateBonus);
    let pA = baseOdds.pAway - diff * 0.15 * (0.5 + 0.5 * lateBonus);
    let pD = 1 - pH - pA;

    // Clamp and renormalise
    pH = Math.max(0.02, Math.min(0.96, pH));
    pA = Math.max(0.02, Math.min(0.96, pA));
    pD = Math.max(0.02, 1 - pH - pA);
    const total = pH + pD + pA;
    pH /= total;
    pD /= total;
    pA /= total;

    return { pHome: pH, pDraw: pD, pAway: pA };
  }

  function minuteOf(rec: HistoricalRecord): number {
    if (rec.Clock?.Seconds && rec.Clock.Seconds > 0) return Math.ceil(rec.Clock.Seconds / 60);
    if (rec.StatusId === 3) return 45;
    if (rec.StatusId === 5) return 90;
    if (rec.StatusId === 10) return 120;
    return 0;
  }

  function utcAtMinute(minute: number): string {
    return new Date(kickoff.getTime() + minute * 60_000).toISOString();
  }

  const teamOf = (participant: 1 | 2): "home" | "away" =>
    (participant === 1) === p1IsHome ? "home" : "away";

  for (const rec of sorted) {
    const minute = minuteOf(rec);

    // Emit an odds tick every ~10 minutes of match time
    if (minute > 0 && minute - lastTickMinute >= 10) {
      const homeGoals = p1IsHome ? g1 : g2;
      const awayGoals = p1IsHome ? g2 : g1;
      const tick = synthesiseOdds(homeGoals, awayGoals, minute);
      lines.push({
        type: "tick",
        data: {
          matchId: matchId!,
          atUtc: utcAtMinute(minute),
          ...tick,
        },
      });
      lastTickMinute = minute;
    }

    // Goals — detect via Score.Total.Goals deltas (same approach as adapter.ts timeline)
    const ng1 = rec.Score?.Participant1?.Total?.Goals;
    const ng2 = rec.Score?.Participant2?.Total?.Goals;

    if (typeof ng1 === "number" && ng1 > g1) {
      while (g1 < ng1) {
        g1++;
        const homeGoals = p1IsHome ? g1 : g2;
        const awayGoals = p1IsHome ? g2 : g1;

        // Emit pre-goal odds tick (current state)
        const preOdds = synthesiseOdds(homeGoals - (teamOf(1) === "home" ? 1 : 0), awayGoals - (teamOf(1) === "away" ? 1 : 0), minute);
        lines.push({
          type: "tick",
          data: { matchId: matchId!, atUtc: utcAtMinute(minute - 0.5), ...preOdds },
        });

        // Emit goal event
        lines.push({
          type: "event",
          data: {
            matchId: matchId!,
            atUtc: utcAtMinute(minute),
            minute,
            kind: "goal",
            team: teamOf(1),
          },
        });

        // Emit post-goal odds tick (shifted)
        const postOdds = synthesiseOdds(homeGoals, awayGoals, minute);
        lines.push({
          type: "tick",
          data: { matchId: matchId!, atUtc: utcAtMinute(minute + 0.5), ...postOdds },
        });
        lastTickMinute = minute;
      }
    }

    if (typeof ng2 === "number" && ng2 > g2) {
      while (g2 < ng2) {
        g2++;
        const homeGoals = p1IsHome ? g1 : g2;
        const awayGoals = p1IsHome ? g2 : g1;

        const preOdds = synthesiseOdds(homeGoals - (teamOf(2) === "home" ? 1 : 0), awayGoals - (teamOf(2) === "away" ? 1 : 0), minute);
        lines.push({
          type: "tick",
          data: { matchId: matchId!, atUtc: utcAtMinute(minute - 0.5), ...preOdds },
        });

        lines.push({
          type: "event",
          data: {
            matchId: matchId!,
            atUtc: utcAtMinute(minute),
            minute,
            kind: "goal",
            team: teamOf(2),
          },
        });

        const postOdds = synthesiseOdds(homeGoals, awayGoals, minute);
        lines.push({
          type: "tick",
          data: { matchId: matchId!, atUtc: utcAtMinute(minute + 0.5), ...postOdds },
        });
        lastTickMinute = minute;
      }
    }

    // Red cards — from Stats keys 5 (P1 reds) and 6 (P2 reds)
    const st = rec.Stats;
    if (st) {
      while (typeof st["5"] === "number" && st["5"] > r1) {
        r1++;
        lines.push({
          type: "event",
          data: {
            matchId: matchId!,
            atUtc: utcAtMinute(minute),
            minute,
            kind: "red_card",
            team: teamOf(1),
          },
        });
      }
      while (typeof st["6"] === "number" && st["6"] > r2) {
        r2++;
        lines.push({
          type: "event",
          data: {
            matchId: matchId!,
            atUtc: utcAtMinute(minute),
            minute,
            kind: "red_card",
            team: teamOf(2),
          },
        });
      }
    }
  }

  // 5. Full-time event
  lines.push({
    type: "event",
    data: {
      matchId: matchId!,
      atUtc: utcAtMinute(90),
      minute: 90,
      kind: "full_time",
      team: null,
    },
  });

  // 6. Final odds tick showing the settled state
  const finalHomeGoals = p1IsHome ? g1 : g2;
  const finalAwayGoals = p1IsHome ? g2 : g1;
  const finalOdds = synthesiseOdds(finalHomeGoals, finalAwayGoals, 90);
  lines.push({
    type: "tick",
    data: {
      matchId: matchId!,
      atUtc: utcAtMinute(90),
      ...finalOdds,
    },
  });

  return lines;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[synthesize-replay] Synthesising replay for match: ${matchId}`);
  console.log(`[synthesize-replay] TxLINE: ${TXLINE_BASE_URL}\n`);

  const headers = await getHeaders();

  // 1. Fixture metadata
  console.log("[synthesize-replay] Fetching fixture metadata...");
  const meta = await getFixtureMeta(headers);
  if (!meta) {
    console.error(
      `[synthesize-replay] Match ${matchId} not found in fixtures. ` +
        "Check the matchId or ensure the match exists in TxLINE."
    );
    process.exit(1);
  }
  console.log(`[synthesize-replay] Match: ${meta.home} v ${meta.away}`);
  console.log(`[synthesize-replay] Kickoff: ${meta.startUtc}`);

  // 2. Pre-match odds
  console.log("[synthesize-replay] Fetching odds...");
  const odds = await getPreMatchOdds(headers);
  if (odds) {
    console.log(
      `[synthesize-replay] Odds: Home=${(odds.pHome * 100).toFixed(1)}% ` +
        `Draw=${(odds.pDraw * 100).toFixed(1)}% Away=${(odds.pAway * 100).toFixed(1)}%`
    );
  } else {
    console.warn("[synthesize-replay] No odds available — using 33/34/33 defaults.");
  }

  // 3. Historical records
  console.log("[synthesize-replay] Fetching historical scores...");
  const records = await getHistoricalRecords(headers);
  console.log(`[synthesize-replay] Got ${records.length} records`);

  // 4. Synthesize
  const lines = synthesize(meta, odds, records);
  console.log(`[synthesize-replay] Synthesised ${lines.length} JSONL lines`);

  // 5. Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${matchId}.jsonl`);
  const content = lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
  fs.writeFileSync(outPath, content, "utf-8");
  console.log(`\n[synthesize-replay] Written: ${outPath}`);

  // Summary
  const goals = lines.filter((l) => l.type === "event" && (l as any).data?.kind === "goal").length;
  const reds = lines.filter((l) => l.type === "event" && (l as any).data?.kind === "red_card").length;
  const ticks = lines.filter((l) => l.type === "tick").length;
  console.log(`[synthesize-replay] Summary: ${goals} goals, ${reds} red cards, ${ticks} odds ticks`);
  console.log("[synthesize-replay] Done.\n");
}

main().catch((err) => {
  console.error("[synthesize-replay] Fatal:", err);
  process.exit(1);
});
