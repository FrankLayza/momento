/**
 * src/app/api/checkin/route.ts
 * POST /api/checkin — records a user's check-in to a match.
 * Implements FR-2.1, FR-2.2 (PRD).
 *
 * Server-side timestamp is authoritative — used to determine Moment claim eligibility.
 * A user MUST NOT be able to claim a Moment whose event_utc precedes their check-in.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordCheckin, listMatches } from "@/server/db/queries";

// ── Request schema ────────────────────────────────────────────────────────────

const CheckinRequestSchema = z.object({
  matchId: z.string(),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = CheckinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid matchId." }, { status: 400 });
  }

  const { matchId } = parsed.data;

  // Verify the match is not already finished (FR-2.1: can't check in after full-time)
  const matches = await listMatches().catch(() => []);
  const match   = matches.find(m => m.id === matchId);

  if (!match) {
    return NextResponse.json({ error: "Match not found." }, { status: 404 });
  }

  if (match.status === "finished") {
    return NextResponse.json({ error: "Match finished — check-in closed." }, { status: 403 });
  }

  // Record the check-in (upsert — safe to call multiple times)
  const witness = await recordCheckin(userId, matchId);

  return NextResponse.json({
    success: true,
    matchId: witness.matchId,
    atUtc:   witness.atUtc,
  });
}
