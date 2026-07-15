/**
 * src/app/api/matches/[id]/events/route.ts
 * GET /api/matches/{id}/events — timeline events (goals + cards) for the Match
 * page's Timeline tab, derived from TxLINE's scores feed (goals via Score
 * deltas, cards via Stats deltas). See getMatchTimeline() in the TxLINE adapter.
 *
 * TxLINE has no player names, so events carry team + minute + running score
 * only — the Timeline UI renders accordingly.
 */

import { NextResponse } from "next/server";
import { getMatchTimeline } from "@/server/txline/adapter";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const events = await getMatchTimeline(id);
  return NextResponse.json({ events });
}
