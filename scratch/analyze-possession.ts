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
      const possessionRecs = raw.filter(r => [
        "possession",
        "safe_possession",
        "attack_possession",
        "danger_possession",
        "high_danger_possession"
      ].includes(r.Action));
      
      console.log(`Found ${possessionRecs.length} possession records.`);
      if (possessionRecs.length > 0) {
        console.log("Inspecting fields of first 10 possession records:");
        possessionRecs.slice(0, 10).forEach((r, idx) => {
          console.log(`Record #${idx}: Action: ${r.Action}, Possession: ${r.Possession}, Participant: ${r.Participant}, Data.Participant: ${r.Data?.Participant}, Data: ${JSON.stringify(r.Data)}`);
        });
        
        // Count how many have which fields set
        let hasPossessionVal = 0;
        let hasParticipantVal = 0;
        let hasDataParticipantVal = 0;
        
        for (const r of possessionRecs) {
          if (r.Possession !== undefined && r.Possession !== null) hasPossessionVal++;
          if (r.Participant !== undefined && r.Participant !== null) hasParticipantVal++;
          if (r.Data?.Participant !== undefined && r.Data?.Participant !== null) hasDataParticipantVal++;
        }
        
        console.log(`\nSummary:`);
        console.log(`  Records with 'Possession' field: ${hasPossessionVal}`);
        console.log(`  Records with 'Participant' field: ${hasParticipantVal}`);
        console.log(`  Records with 'Data.Participant' field: ${hasDataParticipantVal}`);
      }
    }
  }
}

run().catch(console.error);
