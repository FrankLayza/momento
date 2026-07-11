import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), quiet: true });

const FIXTURE_ID = "18213979";

async function main() {
  const baseUrl = process.env.TXLINE_BASE_URL!;
  const jwtRes = await fetch(`${baseUrl}/auth/guest/start`, { method: "POST" });
  const { token } = (await jwtRes.json()) as { token: string };
  const headers = {
    Authorization: `Bearer ${token}`,
    "X-Api-Token": process.env.TXLINE_API_KEY!,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${baseUrl}/api/scores/snapshot/${FIXTURE_ID}`, { headers });
  console.log("status:", res.status, res.statusText);
  const raw: unknown = await res.json();
  console.log("isArray:", Array.isArray(raw), "length:", Array.isArray(raw) ? raw.length : "n/a");

  if (Array.isArray(raw)) {
    const withNumericStatusId = raw.filter(
      (r: any) => typeof r === "object" && r !== null && typeof r.StatusId === "number"
    );
    console.log("records with numeric StatusId:", withNumericStatusId.length, "/", raw.length);

    // sample a few StatusId types across the array to see what's actually there
    const typeCounts: Record<string, number> = {};
    for (const r of raw as any[]) {
      const t = typeof r?.StatusId;
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }
    console.log("StatusId typeof counts:", typeCounts);

    const last = raw[raw.length - 1] as any;
    console.log("LAST record (full):", JSON.stringify(last, null, 2).slice(0, 1500));

    if (withNumericStatusId.length > 0) {
      const lastValid = withNumericStatusId[withNumericStatusId.length - 1] as any;
      console.log("LAST VALID (numeric StatusId) record summary:", {
        StatusId: lastValid.StatusId,
        Clock: lastValid.Clock,
        Score: lastValid.Score,
        Action: lastValid.Action,
        Seq: lastValid.Seq,
      });
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
