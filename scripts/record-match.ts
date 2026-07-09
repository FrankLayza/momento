/**
 * scripts/record-match.ts
 * Records a live TxLINE match stream to a fixtures/replay/*.jsonl file.
 * Implements §5 (Implementation Guide) — required to capture real group-stage matches.
 *
 * Usage:
 *   pnpm record:match --matchId <TXLINE_MATCH_ID>
 *
 * Output file: fixtures/replay/<matchId>.jsonl
 * Each line is one of:
 *   { type: "meta",  matchId, home, away, startUtc }
 *   { type: "tick",  data: NormalisedOddsTick }
 *   { type: "event", data: NormalisedEvent }
 *
 * [NEEDS-HUMAN-INPUT]: This script can only be fully implemented once TxLINE
 * docs are pasted into docs/TXLINE-NOTES.md and adapter.ts is wired up.
 * The structure below is complete; only the adapter calls need real endpoints.
 */

import * as fs   from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";
import { subscribeMatch, listWorldCupMatches } from "../src/server/txline/adapter";
import type { NormalisedOddsTick, NormalisedEvent } from "../src/server/txline/types";

dotenv.config({ path: ".env.local" });

const args    = process.argv.slice(2);
const matchId = args[args.indexOf("--matchId") + 1];

if (!matchId) {
  console.error("Usage: pnpm record:match --matchId <TXLINE_MATCH_ID>");
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.cwd(), "fixtures", "replay");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const outPath = path.join(OUTPUT_DIR, `${matchId}.jsonl`);
const stream  = fs.createWriteStream(outPath, { flags: "a" });

function writeLine(obj: unknown) {
  stream.write(JSON.stringify(obj) + "\n");
}

async function main() {
  console.log(`\n[record-match] Recording match: ${matchId}`);
  console.log(`[record-match] Output: ${outPath}\n`);

  // Write meta line (requires adapter to be wired to get match details)
  const matches = await listWorldCupMatches();
  const match   = matches.find(m => m.id === matchId);

  if (!match) {
    console.error(`[record-match] Match ${matchId} not found. Continuing anyway — meta line will be incomplete.`);
  }

  writeLine({
    type:     "meta",
    matchId,
    home:     match?.home     ?? "[NEEDS-HUMAN-INPUT]",
    away:     match?.away     ?? "[NEEDS-HUMAN-INPUT]",
    startUtc: match?.kickoffUtc ?? new Date().toISOString(),
  });

  const unsub = subscribeMatch(
    matchId,
    (tick: NormalisedOddsTick) => {
      writeLine({ type: "tick", data: tick });
      process.stdout.write(".");
    },
    (event: NormalisedEvent) => {
      writeLine({ type: "event", data: event });
      console.log(`\n[record-match] Event: ${event.kind} at ${event.minute}'`);
    }
  );

  console.log("[record-match] Recording... Press Ctrl+C to stop.\n");

  process.on("SIGINT", () => {
    console.log("\n[record-match] Stopping recorder.");
    unsub();
    stream.end(() => {
      console.log(`[record-match] Saved: ${outPath}`);
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error("[record-match] Fatal:", err);
  process.exit(1);
});
