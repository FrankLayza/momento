/**
 * src/app/api/matches/[id]/claimable/route.ts
 * GET /api/matches/{id}/claimable — fetches currently active, unclaimed moments
 * that are less than 60 seconds old and for which the user is eligible.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCheckin, getMomentsForMatch, getUserEditions } from "@/server/db/queries";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ moments: [] });
  }

  try {
    // 1. Fetch user check-in for the match
    const checkin = await getCheckin(user.id, matchId);
    if (!checkin) {
      return NextResponse.json({ moments: [] });
    }

    const checkinTime = new Date(checkin.atUtc).getTime();

    // 2. Fetch all moments for the match
    const moments = await getMomentsForMatch(matchId);

    // 3. Fetch user's claimed editions
    const editions = await getUserEditions(user.id);
    const claimedMomentIds = new Set(editions.map(e => e.momentId));

    // 4. Filter moments:
    // - created in the last 60 seconds (wall-clock time)
    // - occurred AFTER the user's check-in
    // - not already claimed
    const now = Date.now();
    const claimable = moments.filter(m => {
      const elapsedMs = now - new Date(m.eventUtc).getTime();
      const occurredAfterCheckin = new Date(m.eventUtc).getTime() >= checkinTime;
      const notClaimed = !claimedMomentIds.has(m.id);
      return elapsedMs <= 60_000 && occurredAfterCheckin && notClaimed;
    });

    return NextResponse.json({ moments: claimable });
  } catch (err) {
    console.error("[api/claimable] Error fetching claimable moments:", err);
    return NextResponse.json({ error: "Failed to fetch claimable moments." }, { status: 500 });
  }
}
