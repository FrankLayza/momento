/**
 * src/server/db/queries.ts
 * Typed Supabase query helpers — no raw SQL in API routes.
 * All routes import from here.
 */

import { createClient } from "@supabase/supabase-js";
import type { AppUser, Match, Moment, Edition, Witness } from "@/lib/types";

// ── Supabase client (service role — server only) ──────────────────────────────

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUserById(userId: string): Promise<AppUser | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("users")
    .select("id, display_name, pubkey")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id:          data.id as string,
    displayName: data.display_name as string,
    pubkey:      data.pubkey as string,
  };
}

export async function upsertUser(user: {
  id: string;
  displayName: string;
  pubkey: string;
  encSecret: string;
}): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from("users").upsert({
    id:           user.id,
    display_name: user.displayName,
    pubkey:       user.pubkey,
    enc_secret:   user.encSecret,
  });
  if (error) throw new Error(`upsertUser failed: ${error.message}`);
}

export async function getEncryptedSecret(userId: string): Promise<string | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("users")
    .select("enc_secret")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data.enc_secret as string;
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function upsertMatch(match: Match): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from("matches").upsert({
    id:           match.id,
    home:         match.home,
    away:         match.away,
    kickoff_utc:  match.kickoffUtc,
    status:       match.status,
    p_prematch:   match.pPreMatch,
  });
  if (error) throw new Error(`upsertMatch failed: ${error.message}`);
}

export async function listMatches(): Promise<Match[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("matches")
    .select("*")
    .order("kickoff_utc", { ascending: true });

  if (error) throw new Error(`listMatches failed: ${error.message}`);

  return (data ?? []).map(row => ({
    id:         row.id as string,
    home:       row.home as string,
    away:       row.away as string,
    kickoffUtc: row.kickoff_utc as string,
    status:     row.status as Match["status"],
    minute:     null,
    score:      { home: 0, away: 0 },
    pPreMatch:  row.p_prematch as Match["pPreMatch"],
  }));
}

// ── Check-ins ─────────────────────────────────────────────────────────────────

/** Implements FR-2.1, FR-2.2 */
export async function recordCheckin(userId: string, matchId: string): Promise<Witness> {
  const db = getServiceClient();
  const atUtc = new Date().toISOString();

  const { error } = await db.from("checkins").upsert({
    user_id:  userId,
    match_id: matchId,
    at_utc:   atUtc,
  });
  if (error) throw new Error(`recordCheckin failed: ${error.message}`);

  return { userId, matchId, atUtc };
}

export async function getCheckin(userId: string, matchId: string): Promise<Witness | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("checkins")
    .select("user_id, match_id, at_utc")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .single();

  if (error || !data) return null;
  return {
    userId:  data.user_id as string,
    matchId: data.match_id as string,
    atUtc:   data.at_utc as string,
  };
}

export async function getWitnessesForMatch(matchId: string): Promise<Witness[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("checkins")
    .select("user_id, match_id, at_utc")
    .eq("match_id", matchId);

  if (error) throw new Error(`getWitnessesForMatch failed: ${error.message}`);

  return (data ?? []).map(row => ({
    userId:  row.user_id as string,
    matchId: row.match_id as string,
    atUtc:   row.at_utc as string,
  }));
}

// ── Moments ───────────────────────────────────────────────────────────────────

export async function insertMoment(moment: Omit<Moment, "id">): Promise<Moment> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("moments")
    .insert({
      match_id:      moment.matchId,
      trigger:       moment.trigger,
      minute:        moment.minute,
      event_utc:     moment.eventUtc,
      score_home:    moment.scoreHome,
      score_away:    moment.scoreAway,
      p_before:      moment.pBefore,
      p_after:       moment.pAfter,
      p_pre_match:   moment.pPreMatch,
      shock_score:   moment.shockScore,
      tier:          moment.tier,
      witness_count: moment.witnessCount,
      sealed_at:     moment.sealedAt,
      dedupe_key:    moment.dedupeKey,
    })
    .select("*")
    .single();

  if (error) throw new Error(`insertMoment failed: ${error.message}`);
  return dbRowToMoment(data);
}

export async function getMomentById(id: string): Promise<Moment | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("moments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return dbRowToMoment(data);
}

export async function getMomentsForMatch(matchId: string): Promise<Moment[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("moments")
    .select("*")
    .eq("match_id", matchId)
    .order("event_utc", { ascending: true });

  if (error) throw new Error(`getMomentsForMatch failed: ${error.message}`);
  return (data ?? []).map(dbRowToMoment);
}

// ── Editions ──────────────────────────────────────────────────────────────────

/** Implements FR-5.1–5.3 */
export async function insertEdition(momentId: string, userId: string): Promise<Edition> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("editions")
    .insert({
      moment_id:    momentId,
      user_id:      userId,
      chain_status: "pending_chain",
    })
    .select("*")
    .single();

  if (error) throw new Error(`insertEdition failed: ${error.message}`);
  return dbRowToEdition(data);
}

export async function updateEditionChainStatus(
  editionId: string,
  update: { chainStatus: "confirmed" | "failed"; assetId?: string; txSig?: string }
): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from("editions").update({
    chain_status: update.chainStatus,
    asset_id:     update.assetId ?? null,
    tx_sig:       update.txSig  ?? null,
  }).eq("id", editionId);

  if (error) throw new Error(`updateEditionChainStatus failed: ${error.message}`);
}

export async function getEditionByUserAndMoment(
  userId: string,
  momentId: string
): Promise<Edition | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("editions")
    .select("*")
    .eq("user_id", userId)
    .eq("moment_id", momentId)
    .single();

  if (error || !data) return null;
  return dbRowToEdition(data);
}

export async function getUserEditions(userId: string): Promise<Edition[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("editions")
    .select("*")
    .eq("user_id", userId)
    .order("claimed_at", { ascending: false });

  if (error) throw new Error(`getUserEditions failed: ${error.message}`);
  return (data ?? []).map(dbRowToEdition);
}

export async function getPendingChainEditions(): Promise<Edition[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("editions")
    .select("*")
    .eq("chain_status", "pending_chain");

  if (error) throw new Error(`getPendingChainEditions failed: ${error.message}`);
  return (data ?? []).map(dbRowToEdition);
}

// ── Leaderboard (FR-7.1) ─────────────────────────────────────────────────────

export async function getLeaderboard(limit = 50): Promise<
  Array<{ userId: string; displayName: string; totalShockScore: number }>
> {
  const db = getServiceClient();
  // Join editions → moments → users to sum shock_score per user
  const { data, error } = await db.rpc("leaderboard_top", { p_limit: limit });
  if (error) {
    // Graceful degradation if RPC not yet defined
    console.warn("leaderboard_top RPC not found — returning empty:", error.message);
    return [];
  }
  return (data ?? []) as Array<{ userId: string; displayName: string; totalShockScore: number }>;
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function dbRowToMoment(row: Record<string, unknown>): Moment {
  return {
    id:           row["id"] as string,
    matchId:      row["match_id"] as string,
    trigger:      row["trigger"] as Moment["trigger"],
    minute:       row["minute"] as number,
    eventUtc:     row["event_utc"] as string,
    scoreHome:    row["score_home"] as number,
    scoreAway:    row["score_away"] as number,
    pBefore:      row["p_before"] as Moment["pBefore"],
    pAfter:       row["p_after"] as Moment["pAfter"],
    pPreMatch:    row["p_pre_match"] as Moment["pPreMatch"],
    shockScore:   row["shock_score"] as number,
    tier:         row["tier"] as Moment["tier"],
    witnessCount: row["witness_count"] as number,
    sealedAt:     row["sealed_at"] as string | null,
    dedupeKey:    row["dedupe_key"] as string,
  };
}

function dbRowToEdition(row: Record<string, unknown>): Edition {
  return {
    id:          row["id"] as string,
    momentId:    row["moment_id"] as string,
    userId:      row["user_id"] as string,
    claimedAt:   row["claimed_at"] as string,
    chainStatus: row["chain_status"] as Edition["chainStatus"],
    assetId:     row["asset_id"] as string | null,
    txSig:       row["tx_sig"] as string | null,
  };
}
