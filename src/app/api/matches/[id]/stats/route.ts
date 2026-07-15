/**
 * src/app/api/matches/[id]/stats/route.ts
 * GET /api/matches/{id}/stats — team match stats (possession, shots, corners,
 * cards, etc.) for the Match page's Stats tab, counted from TxLINE's scores
 * feed. See getMatchStats() in the TxLINE adapter.
 */

import { NextResponse } from "next/server";
import { getMatchStats } from "@/server/txline/resolve";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await getMatchStats(id);
  return NextResponse.json({ stats });
}
