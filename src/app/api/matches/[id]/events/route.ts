/**
 * src/app/api/matches/[id]/events/route.ts
 * GET /api/matches/{id}/events — timeline events (goals/cards/substitutions)
 * for the Match page's Timeline tab. Backed by API-Football, not TxLINE —
 * see src/server/football/adapter.ts for why.
 */

import { NextResponse } from "next/server";
import { listMatches } from "@/server/db/queries";
import { getMatchTimeline } from "@/server/football/adapter";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const matches = await listMatches().catch(() => []);
  const match = matches.find((m) => m.id === id);
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const events = await getMatchTimeline(match.id, match.home, match.away, match.kickoffUtc);
  return NextResponse.json({ events });
}
