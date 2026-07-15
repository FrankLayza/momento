import { getLiveMatchState, getMatchStats, getMatchTimeline } from "../src/server/txline/resolve";
import { config as loadEnv } from "dotenv";
import * as path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

async function run() {
  const matchId = "18241006";
  console.log(`Checking match ${matchId} via resolve resolver...`);
  
  const state = await getLiveMatchState(matchId);
  console.log("Live State:", state);
  
  const stats = await getMatchStats(matchId);
  console.log("Stats (possession):", stats?.home.possession, "vs", stats?.away.possession);
  console.log("Momentum count:", stats?.momentum.length);
  console.log("Momentum non-zero values:", stats?.momentum.map(x => x.value).filter(v => v !== 0));

  const timeline = await getMatchTimeline(matchId);
  console.log(`Timeline (${timeline.length} events):`);
  for (const t of timeline) {
    console.log(`  - ${t.minute}' ${t.kind} by ${t.team}, score: ${t.scoreHome}-${t.scoreAway}, phase: ${t.phase}`);
  }
}

run().catch(console.error);
