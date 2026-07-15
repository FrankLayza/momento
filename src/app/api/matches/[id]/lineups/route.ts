/**
 * src/app/api/matches/[id]/lineups/route.ts
 * GET /api/matches/{id}/lineups — starting XI + bench + formation for the Match
 * page's Lineups tab, parsed from TxLINE's `lineups` action record (real player
 * names, numbers, positions). See getMatchLineups() in the TxLINE adapter.
 *
 * Availability depends on the fixture's coverage level, so this may return
 * { lineups: null } — the UI falls back to a formation preview.
 */

import { NextResponse } from "next/server";
import { getMatchLineups } from "@/server/txline/adapter";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lineups = await getMatchLineups(id);
  return NextResponse.json({ lineups });
}
