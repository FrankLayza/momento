/**
 * src/app/api/claim/route.ts
 * POST /api/claim — claims a Moment edition for a signed-in user.
 * Implements FR-5.1, FR-5.2, FR-5.3 (PRD).
 *
 * Eligibility checks (all enforced server-side):
 *   1. User is signed in.
 *   2. User checked in to the match before the Moment's event_utc.
 *   3. Moment is still within the 24h claim window (not sealed).
 *   4. User has not already claimed this Moment.
 *
 * Mint failures do NOT block the claim:
 *   Edition is created as "pending_chain"; worker retries the mint.
 *   Fan sees "Claimed" immediately.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import {
  getMomentById,
  getCheckin,
  getEditionByUserAndMoment,
  insertEdition,
  getUserById,
  listMatches,
} from "@/server/db/queries";
import { mintEdition } from "@/server/chain/mintEdition";
import { updateEditionChainStatus } from "@/server/db/queries";

// ── Request schema ────────────────────────────────────────────────────────────

const ClaimRequestSchema = z.object({
  momentId: z.string().uuid(),
});

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = ClaimRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { momentId } = parsed.data;

  // Fetch the Moment
  const moment = await getMomentById(momentId).catch(() => null);
  if (!moment) {
    return NextResponse.json({ error: "Moment not found." }, { status: 404 });
  }

  // FR-5.2: Check claim window (24h after full-time)
  if (moment.sealedAt) {
    const sealedAt = new Date(moment.sealedAt).getTime();
    if (Date.now() > sealedAt) {
      return NextResponse.json({ error: "The claim window for this Moment has closed." }, { status: 403 });
    }
  }

  // FR-2.2: Check user was checked in before the Moment's event
  const checkin = await getCheckin(userId, moment.matchId).catch(() => null);
  if (!checkin) {
    return NextResponse.json({ error: "You were not checked in for this one." }, { status: 403 });
  }

  const checkinTime  = new Date(checkin.atUtc).getTime();
  const eventTime    = new Date(moment.eventUtc).getTime();
  if (checkinTime > eventTime) {
    return NextResponse.json({ error: "You checked in after this Moment occurred." }, { status: 403 });
  }

  // Check for duplicate claim
  const existing = await getEditionByUserAndMoment(userId, momentId).catch(() => null);
  if (existing) {
    return NextResponse.json({ error: "You have already claimed this Moment." }, { status: 409 });
  }

  // Create the edition row (pending_chain) — fan sees "Claimed" instantly
  const edition = await insertEdition(momentId, userId);

  // Attempt mint immediately; worker will retry if this fails
  const appUser = await getUserById(userId).catch(() => null);
  const matches = await listMatches().catch(() => []);
  const match   = matches.find(m => m.id === moment.matchId);

  if (appUser && match) {
    try {
      const result = await mintEdition(moment, appUser.pubkey, match.home, match.away);
      await updateEditionChainStatus(edition.id, {
        chainStatus: "confirmed",
        assetId:     result.assetId,
        txSig:       result.txSig,
      });
    } catch (err) {
      // Mint failure is non-fatal — edition stays pending_chain; worker retries
      console.error("[api/claim] Mint failed (worker will retry):", err);
    }
  }

  return NextResponse.json({
    success:   true,
    editionId: edition.id,
    message:   "Claimed. Verified and permanent.",
  });
}
