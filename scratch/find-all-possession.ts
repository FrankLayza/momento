import { config } from "dotenv";
import * as path from "node:path";
import * as dns from "node:dns";

config({ path: path.resolve(process.cwd(), ".env.local") });
dns.setDefaultResultOrder("ipv4first");

const BASE = process.env.TXLINE_BASE_URL!;
const KEY = process.env.TXLINE_API_KEY!;

async function run() {
  const matchId = "18241006";
  const guestRes = await fetch(`${BASE}/auth/guest/start`, { method: "POST" });
  const jwt = ((await guestRes.json()) as any).token;
  const h = { Authorization: `Bearer ${jwt}`, "X-Api-Token": KEY };
  
  const snapRes = await fetch(`${BASE}/api/scores/snapshot/${matchId}`, { headers: h });
  if (snapRes.ok) {
    const raw = await snapRes.json();
    if (Array.isArray(raw)) {
      const posTypeRecs = raw.filter(r => r.PossessionType !== undefined || r.Possession !== undefined);
      console.log(`Total records in snapshot: ${raw.length}`);
      console.log(`Records with Possession or PossessionType: ${posTypeRecs.length}`);
      if (posTypeRecs.length > 0) {
        console.log("\nUnique PossessionTypes found:", Array.from(new Set(posTypeRecs.map(r => r.PossessionType).filter(Boolean))));
        console.log("Unique Actions on these records:", Array.from(new Set(posTypeRecs.map(r => r.Action))));
        console.log("\nFirst 10 records with Possession/PossessionType:");
        posTypeRecs.slice(0, 10).forEach((r, idx) => {
          console.log(`  #${idx}: Seq: ${r.Seq}, Action: ${r.Action}, Possession: ${r.Possession}, PossessionType: ${r.PossessionType}`);
        });
      }
    }
  }
}

run().catch(console.error);
