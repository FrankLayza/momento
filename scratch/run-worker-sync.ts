import { config } from "dotenv";
import * as path from "node:path";
import * as dns from "node:dns";
import * as fs from "node:fs";

// Mock WebSocket class to prevent Supabase Realtime client initialization crash on Node <22
(global as any).WebSocket = class {
  constructor() {}
  addEventListener() {}
  removeEventListener() {}
};

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });
dns.setDefaultResultOrder("ipv4first");

import * as replay from "../src/server/txline/replay";
import { getWitnessesForMatch } from "../src/server/db/queries";

async function run() {
  console.log("REPLAY_MODE:", process.env.REPLAY_MODE);
  console.log("REPLAY_MATCH_ID:", process.env.REPLAY_MATCH_ID);
  
  console.log("\nListing replay matches...");
  const matches = await replay.listWorldCupMatches();
  console.log("Matches:", matches);

  for (const match of matches) {
    const witnesses = await getWitnessesForMatch(match.id);
    console.log(`Match: ${match.home} v ${match.away} (${match.id}):`);
    console.log(`  status: ${match.status}`);
    console.log(`  witnesses count: ${witnesses.length}`);
  }
}

run().catch(console.error);
