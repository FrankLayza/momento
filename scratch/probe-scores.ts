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
  
  console.log(`Fetching snapshot scores for ${matchId}...`);
  const response = await fetch(`${BASE}/api/scores/snapshot/${matchId}`, { headers: h });
  console.log("Status:", response.status, response.statusText);
  if (response.ok) {
    const raw = await response.json();
    console.log("Is array:", Array.isArray(raw));
    if (Array.isArray(raw)) {
      console.log("Total records:", raw.length);
      if (raw.length > 0) {
        console.log("First 3 records:");
        console.log(JSON.stringify(raw.slice(0, 3), null, 2));
        console.log("Last 3 records:");
        console.log(JSON.stringify(raw.slice(-3), null, 2));
        
        console.log("Actions in snapshot:", Array.from(new Set(raw.map(r => r.Action))));
        console.log("Distinct StatusIds:", Array.from(new Set(raw.map(r => r.StatusId))));
      }
    }
  }
}

run().catch(console.error);
