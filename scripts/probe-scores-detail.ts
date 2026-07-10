/**
 * scripts/probe-scores-detail.ts
 * Dump first and last 3 score records to understand shape variation.
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
import dns from "node:dns";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });
dns.setDefaultResultOrder("ipv4first");

const BASE = process.env.TXLINE_BASE_URL!;
const API_KEY = process.env.TXLINE_API_KEY!;

async function getJwt(): Promise<string> {
  const res = await fetch(`${BASE}/auth/guest/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await res.json()) as { token: string };
  return data.token;
}

async function main() {
  const jwt = await getJwt();
  const headers: HeadersInit = {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": API_KEY,
    "Content-Type": "application/json",
  };

  const MATCH_ID = "18218149";
  const res = await fetch(`${BASE}/api/scores/snapshot/${MATCH_ID}`, { headers });
  if (!res.ok) {
    console.log("Failed:", res.status);
    return;
  }
  const raw = await res.json() as unknown[];
  console.log(`Total records: ${raw.length}`);
  
  // Show first record keys and values
  console.log("\n=== FIRST RECORD ===");
  const first = raw[0] as Record<string, unknown>;
  console.log("Keys:", Object.keys(first));
  console.log("StatusId:", first.StatusId);
  console.log("Clock:", JSON.stringify(first.Clock));
  console.log("Action:", first.Action);
  console.log("Has Score?:", !!first.Score);
  console.log("Has Stats?:", !!first.Stats);
  console.log("Has Participant1IsHome?:", first.Participant1IsHome !== undefined);
  console.log(JSON.stringify(first, null, 2));
  
  // Show record at index 1
  if (raw.length > 1) {
    console.log("\n=== SECOND RECORD ===");
    const second = raw[1] as Record<string, unknown>;
    console.log("Keys:", Object.keys(second));
    console.log("StatusId:", second.StatusId);
    console.log(JSON.stringify(second, null, 2));
  }
}

main().catch(console.error);
