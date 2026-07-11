import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

import { listWorldCupMatches } from "@/server/txline/adapter";

async function main() {
  const matches = await listWorldCupMatches();
  console.log("now (UTC):", new Date().toISOString());
  for (const m of matches) {
    console.log(
      m.id, m.home, "vs", m.away,
      "| status:", m.status,
      "| kickoff:", m.kickoffUtc,
      "| score:", `${m.score.home}-${m.score.away}`,
      "| minute:", m.minute
    );
  }
}

main().catch(err => { console.error(err); process.exit(1); });
