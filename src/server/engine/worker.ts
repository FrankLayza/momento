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


import { listWorldCupMatches } from "@/server/txline/adapter";
import { trackMatch, untrackMatch } from "@/server/engine/momentEngine";
import { mintEdition } from "@/server/chain/mintEdition";
import { getPrematchProbabilities } from "@/server/txline/adapter";
import type { Match } from "@/lib/types";
import {
  listMatches,
  getWitnessesForMatch,
  getPendingChainEditions,
  getMomentById,
  updateEditionChainStatus,
  getUserById,
  upsertMatch,
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
    const fixtures = await listWorldCupMatches();

    for (const match of fixtures) {
      // Persist the match to the database so it appears on the web UI
      await upsertMatch({
        ...match,
        pPreMatch: null,
      });

      if (match.status === "finished") {
        if (activeMatches.has(match.id)) {
          untrackMatch(match.id);
          activeMatches.delete(match.id);
        }
        continue;
      }

      if (match.status === "live" && !activeMatches.has(match.id)) {
        const witnesses = await getWitnessesForMatch(match.id);
        if (witnesses.length === 0) continue; // FR-3.1: only track if witnesses exist

        const rawProb = await getPrematchProbabilities(match.id);
        const pPreMatch = rawProb
          ? { home: rawProb.pHome, draw: rawProb.pDraw, away: rawProb.pAway }
          : null;

        // Import adapter dynamically to allow REPLAY_MODE env override
        const adapter = await getAdapter();

        trackMatch(match.id, match.home, match.away, pPreMatch, adapter);
        activeMatches.add(match.id);
      }
    }

    // Mark matches that have kicked off but are no longer in the active snapshot as finished
    const dbMatches = await listMatches().catch(() => [] as Match[]);
    const activeIds = new Set(fixtures.map(f => f.id));

    for (const dbMatch of dbMatches) {
      if (dbMatch.status !== "finished" && !activeIds.has(dbMatch.id)) {
        const kickoffTime = new Date(dbMatch.kickoffUtc).getTime();
        if (kickoffTime < Date.now()) {
          console.log(`[worker] Marking match ${dbMatch.home} v ${dbMatch.away} (${dbMatch.id}) as finished (missing from active fixtures)`);
          await upsertMatch({
            ...dbMatch,
            status: "finished",
          });

          if (activeMatches.has(dbMatch.id)) {
            untrackMatch(dbMatch.id);
            activeMatches.delete(dbMatch.id);
          }
        }
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

  console.log("[worker] Engine running. Ctrl+C to stop.");
}

main().catch(err => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
