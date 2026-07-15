import { config } from "dotenv";
import * as path from "node:path";
import * as dns from "node:dns";

config({ path: path.resolve(process.cwd(), ".env.local") });
dns.setDefaultResultOrder("ipv4first");

const BASE = process.env.TXLINE_BASE_URL!;
const KEY = process.env.TXLINE_API_KEY!;

function parseSse(text: string): any[] {
  const out: any[] = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const dl = block.split(/\r?\n/).filter(l => l.startsWith("data:")).map(l => l.slice(l.indexOf(":")+1).trim());
    if (!dl.length) continue;
    try {
      out.push(JSON.parse(dl.join("\n")));
    } catch {
      for (const line of dl) {
        try { out.push(JSON.parse(line)); } catch {}
      }
    }
  }
  return out;
}

async function run() {
  const matchId = "18241006";
  const guestRes = await fetch(`${BASE}/auth/guest/start`, { method: "POST" });
  const jwt = ((await guestRes.json()) as any).token;
  const h = { Authorization: `Bearer ${jwt}`, "X-Api-Token": KEY };
  
  console.log(`Fetching updates for ${matchId}...`);
  const response = await fetch(`${BASE}/api/scores/updates/${matchId}`, { headers: h });
  console.log("Status:", response.status, response.statusText);
  if (response.ok) {
    const text = await response.text();
    console.log("Raw text length:", text.length);
    const arr = parseSse(text);
    console.log("Total SSE records:", arr.length);
    if (arr.length > 0) {
      console.log("First record:", JSON.stringify(arr[0]));
      console.log("Last record:", JSON.stringify(arr[arr.length - 1]));
    }
  }
}

run().catch(console.error);
