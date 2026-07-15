/**
 * src/server/engine/worker.ts
 * Long-running Node process — entry point for the Moment Engine worker.
 *
 * Start with: pnpm worker
 * Deploy on Railway or Render free tier (must run continuously — not Vercel serverless).
 *
 * Responsibilities:
 *   1. Poll TxLINE for fixtures with at least one Witness (FR-3.1).
 *   2. Start/stop tracking matches via the Moment Engine.
 *   3. Retry pending_chain editions via mintEdition (§8).
 *   4. Seal Moments 24 hours after full-time (FR-5.2).
 */

import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load environment variables before any other imports execute
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

import dns from "node:dns";
// Force IPv4 first to prevent Node 17+ undici connection timeouts
dns.setDefaultResultOrder("ipv4first");


import { trackMatch, untrackMatch } from "@/server/engine/momentEngine";
import { mintEdition } from "@/server/chain/mintEdition";
import {
  listMatches,
  getWitnessesForMatch,
  getPendingChainEditions,
  getMomentById,
  updateEditionChainStatus,
  getUserById,
  upsertMatch,
  markMatchFinished,
  sealExpiredMoments,
} from "@/server/db/queries";

// ── Config ────────────────────────────────────────────────────────────────────

const FIXTURE_POLL_INTERVAL_MS  = 60_000;    // 60s
const RETRY_MINT_INTERVAL_MS    = 5 * 60_000; // 5m
const SEAL_CHECK_INTERVAL_MS    = 60_000;    // 60s
const SEAL_AFTER_MS             = 24 * 60 * 60 * 1_000; // 24h

// Tracks which matches the engine is currently subscribed to
const activeMatches = new Set<string>();

// ── Fixture polling ───────────────────────────────────────────────────────────

async function syncFixtures(): Promise<void> {
  try {
    // Use the replay adapter's listWorldCupMatches when in replay mode —
    // previously this always hit the live TxLINE API, meaning replay fixtures
    // were never seen by the worker.
    const adapter = await getAdapter();
    const fixtures = await adapter.listWorldCupMatches();
    console.log(`[worker] syncFixtures: ${fixtures.length} fixtures (${fixtures.filter(f => f.status === "live").length} live, ${fixtures.filter(f => f.status === "finished").length} finished, ${fixtures.filter(f => f.status === "scheduled").length} scheduled)`);

    for (const match of fixtures) {
      // Persist the match to the database so it appears on the web UI
      await upsertMatch({
        ...match,
        pPreMatch: null,
      });

      if (match.status === "finished") {
        // Stamp the full-time timestamp once — anchors the 24h seal window (FR-5.2).
        await markMatchFinished(match.id);
        if (activeMatches.has(match.id)) {
          console.log(`[worker] Match finished: ${match.home} v ${match.away} (${match.id}) — untracking`);
          untrackMatch(match.id);
          activeMatches.delete(match.id);
        }
        continue;
      }

      if (match.status === "live" && !activeMatches.has(match.id)) {
        // Log witness count but don't block tracking — the engine needs to
        // detect Moments regardless; witness count only matters for delivery.
        const witnesses = await getWitnessesForMatch(match.id);
        console.log(`[worker] Live match ${match.home} v ${match.away} (${match.id}) — ${witnesses.length} witnesses, score ${match.score.home}-${match.score.away}, min ${match.minute}`);

        const rawProb = await adapter.getPrematchProbabilities(match.id);
        const pPreMatch = rawProb
          ? { home: rawProb.pHome, draw: rawProb.pDraw, away: rawProb.pAway }
          : null;

        if (pPreMatch) {
          console.log(`[worker] Pre-match odds: Home=${(pPreMatch.home * 100).toFixed(1)}% Draw=${(pPreMatch.draw * 100).toFixed(1)}% Away=${(pPreMatch.away * 100).toFixed(1)}%`);
        } else {
          console.warn(`[worker] No pre-match odds available for ${match.id}`);
        }

        // adapter already resolved above via getAdapter()

        trackMatch(match.id, match.home, match.away, pPreMatch, adapter, match.score);
        activeMatches.add(match.id);
        console.log(`[worker] Now tracking: ${match.home} v ${match.away} (${match.id})`);
      }
    }
  } catch (err) {
    console.error("[worker] syncFixtures error:", err);
  }
}

// ── Mint retry loop ───────────────────────────────────────────────────────────

async function retryPendingMints(): Promise<void> {
  try {
    const pending = await getPendingChainEditions();
    console.log(`[worker] Retrying ${pending.length} pending chain editions`);

    for (const edition of pending) {
      try {
        const moment = await getMomentById(edition.momentId);
        const user   = await getUserById(edition.userId);
        if (!moment || !user) continue;

        // Get match info for NFT name
        const matches = await listMatches();
        const match   = matches.find(m => m.id === moment.matchId);
        if (!match) continue;

        const result = await mintEdition(moment, user.pubkey, match.home, match.away);

        await updateEditionChainStatus(edition.id, {
          chainStatus: "confirmed",
          assetId:     result.assetId,
          txSig:       result.txSig,
        });

        console.log(`[worker] Mint confirmed: edition ${edition.id} → tx ${result.txSig}`);
      } catch (err) {
        console.error(`[worker] Mint retry failed for edition ${edition.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[worker] retryPendingMints error:", err);
  }
}

// ── Seal loop (FR-5.2) ────────────────────────────────────────────────────────

async function runSeal(): Promise<void> {
  try {
    const sealed = await sealExpiredMoments(SEAL_AFTER_MS);
    if (sealed > 0) {
      console.log(`[worker] Sealed ${sealed} Moment(s) past the 24h claim window`);
    }
  } catch (err) {
    console.error("[worker] runSeal error:", err);
  }
}

// ── Adapter selection (live vs. replay) ──────────────────────────────────────

async function getAdapter() {
  if (process.env.REPLAY_MODE === "true") {
    // FR-1.3: Replay mode — import replay.ts instead of adapter.ts
    return await import("@/server/txline/replay");
  }
  return await import("@/server/txline/adapter");
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[worker] Momento engine worker starting...");
  console.log(`[worker] Replay mode: ${process.env.REPLAY_MODE === "true" ? "ON" : "OFF"}`);

  // Initial sync
  await syncFixtures();

  // Recurring fixture sync
  setInterval(() => { void syncFixtures(); }, FIXTURE_POLL_INTERVAL_MS);

  // Recurring mint retry
  setInterval(() => { void retryPendingMints(); }, RETRY_MINT_INTERVAL_MS);

  // Recurring seal check (FR-5.2) — freeze Moments 24h after full-time
  void runSeal();
  setInterval(() => { void runSeal(); }, SEAL_CHECK_INTERVAL_MS);

  console.log("[worker] Engine running. Ctrl+C to stop.");
}

main().catch(err => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
