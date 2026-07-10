/**
 * scripts/probe-api.ts
 * One-shot diagnostic: hit the real TxLINE endpoints and dump the response shapes
 * so we can fix adapter.ts against reality.
 *
 * Run: npx tsx scripts/probe-api.ts
 */

import { config as loadEnv } from "dotenv";
import path from "node:path";
import dns from "node:dns";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });
dns.setDefaultResultOrder("ipv4first");

const BASE = process.env.TXLINE_BASE_URL!;
const API_KEY = process.env.TXLINE_API_KEY!;

async function getJwt(): Promise<string> {
  const res = await fetch(`${BASE}/auth/guest/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`JWT fetch failed: ${res.status}`);
  const data = (await res.json()) as { token: string };
  return data.token;
}

async function main() {
  const jwt = await getJwt();
  const headers: HeadersInit = {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": API_KEY,
    "Content-Type": "application/json",
  };

  // 1. Fixtures snapshot — first 2 items
  console.log("\n=== FIXTURES SNAPSHOT (first 2) ===");
  const fixtRes = await fetch(`${BASE}/api/fixtures/snapshot`, { headers });
  if (fixtRes.ok) {
    const fixtures = (await fixtRes.json()) as unknown[];
    console.log(`Total fixtures: ${fixtures.length}`);
    for (const f of fixtures.slice(0, 2)) {
      console.log(JSON.stringify(f, null, 2));
    }
    // Also find Spain vs Belgium (18218149)
    const spaBel = (fixtures as any[]).find((f: any) => f.FixtureId === 18218149);
    if (spaBel) {
      console.log("\n=== Spain vs Belgium fixture ===");
      console.log(JSON.stringify(spaBel, null, 2));
    }
  } else {
    console.log(`Fixtures fetch failed: ${fixtRes.status}`);
  }

  // 2. Scores snapshot for Spain vs Belgium
  const MATCH_ID = "18218149";
  console.log(`\n=== SCORES SNAPSHOT (${MATCH_ID}) ===`);
  const scoreRes = await fetch(`${BASE}/api/scores/snapshot/${MATCH_ID}`, { headers });
  if (scoreRes.ok) {
    const raw = await scoreRes.json();
    if (Array.isArray(raw)) {
      console.log(`Array of ${raw.length} records`);
      console.log("First record:", JSON.stringify(raw[0], null, 2));
      console.log("Last record:", JSON.stringify(raw[raw.length - 1], null, 2));
    } else {
      console.log("Single object:", JSON.stringify(raw, null, 2));
    }
  } else {
    console.log(`Scores fetch failed: ${scoreRes.status}`);
  }

  // 3. Odds snapshot for Spain vs Belgium
  console.log(`\n=== ODDS SNAPSHOT (${MATCH_ID}) ===`);
  const oddsRes = await fetch(`${BASE}/api/odds/snapshot/${MATCH_ID}`, { headers });
  if (oddsRes.ok) {
    const raw = await oddsRes.json();
    if (Array.isArray(raw)) {
      console.log(`Array of ${raw.length} records`);
      // Show first record fully
      console.log("First record:", JSON.stringify(raw[0], null, 2));
      // Show all unique SuperOddsType values
      const types = [...new Set((raw as any[]).map((r: any) => r.SuperOddsType))];
      console.log("SuperOddsType values:", types);
      // Find the 1X2 market
      const match1x2 = (raw as any[]).find((r: any) =>
        r.SuperOddsType?.includes("1X2") || r.SuperOddsType?.includes("RESULT")
      );
      if (match1x2) {
        console.log("\n=== 1X2 MARKET ===");
        console.log(JSON.stringify(match1x2, null, 2));
      }
    } else {
      console.log("Single object:", JSON.stringify(raw, null, 2));
    }
  } else {
    console.log(`Odds fetch failed: ${oddsRes.status}`);
  }

  // 4. Also probe a currently-live match if any fixture has a live-looking status
  console.log("\n=== LOOKING FOR LIVE FIXTURES ===");
  const fixtRes2 = await fetch(`${BASE}/api/fixtures/snapshot`, { headers });
  if (fixtRes2.ok) {
    const fixtures2 = (await fixtRes2.json()) as any[];
    const worldCup = fixtures2.filter((f: any) => {
      const comp = (f.Competition || "").toLowerCase();
      return comp.includes("world cup") || comp.includes("friendlies");
    });
    console.log(`World Cup/Friendlies fixtures: ${worldCup.length}`);
    for (const f of worldCup) {
      const kickoff = new Date(f.StartTime);
      const now = new Date();
      const minsAgo = (now.getTime() - kickoff.getTime()) / 60000;
      if (minsAgo > 0 && minsAgo < 150) {
        console.log(`\nPotentially live: ${f.Participant1} vs ${f.Participant2} (${f.FixtureId})`);
        console.log(`  Kickoff: ${kickoff.toISOString()}, ${Math.round(minsAgo)} mins ago`);
        console.log(`  GameState: ${f.GameState}`);
        console.log(`  Full fixture:`, JSON.stringify(f, null, 2));

        // Probe scores for this fixture
        const sr = await fetch(`${BASE}/api/scores/snapshot/${f.FixtureId}`, { headers });
        if (sr.ok) {
          const sdata = await sr.json();
          if (Array.isArray(sdata) && sdata.length > 0) {
            console.log(`  Scores: array of ${sdata.length} records`);
            console.log(`  Last score record:`, JSON.stringify(sdata[sdata.length - 1], null, 2));
          } else {
            console.log(`  Scores:`, JSON.stringify(sdata, null, 2));
          }
        }
      }
    }
  }
}

main().catch(console.error);
