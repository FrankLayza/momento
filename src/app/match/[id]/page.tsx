/**
 * src/app/match/[id]/page.tsx
 * Live match page with win-probability bar + check-in.
 * Implements FR-1.2, FR-2.1 (PRD).
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { copy } from "@/lib/copy";
import { getMomentsForMatch, listMatches, getCheckin, getUserById } from "@/server/db/queries";
import { getLiveMatchState, getPrematchProbabilities, getFinishedMatchScore } from "@/server/txline/adapter";
import { createClient } from "@/utils/supabase/server";
import { Navbar } from "@/components/Navbar";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { MomentCard } from "@/components/MomentCard";
import { CheckinButton } from "@/components/CheckinButton";
import { WitnessNotifications } from "@/components/WitnessNotifications";
import { Avatar } from "@/components/Avatar";
import type { Match, Moment } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const matches = await listMatches().catch(() => [] as Match[]);
  const match   = matches.find(m => m.id === id);
  if (!match) return { title: "Match" };
  return { title: `${match.home} v ${match.away} | Momento` };
}

export const revalidate = 10; // ISR: refresh every 10 seconds for real-time live score updates

export default async function MatchPage({ params }: Props) {
  const { id } = await params;
  const matches = await listMatches().catch(() => [] as Match[]);
  const match   = matches.find(m => m.id === id);
  const moments = await getMomentsForMatch(id).catch(() => [] as Moment[]);

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  const isWitness = user
    ? Boolean(await getCheckin(user.id, id).catch(() => null))
    : false;

  let displayName = "Fan";
  if (user) {
    try {
      const appUser = await getUserById(user.id).catch(() => null);
      displayName = appUser?.displayName || user.email?.split("@")[0] || "Fan";
    } catch (err) {
      console.error("[MatchPage] Failed to fetch user profile:", err);
    }
  }

  if (!match) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-ink-muted">{copy.errors.notFound}</p>
      </main>
    );
  }

  const kickoffTime = new Date(match.kickoffUtc).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const kickoffDate = new Date(match.kickoffUtc).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  // 1. Fetch live data from TxLINE if the match is live or finished
  let liveScore = match.score;
  let liveMinute = match.minute;
  let currentStatus = match.status;

  if (match.status === "live") {
    try {
      const liveState = await getLiveMatchState(match.id);
      if (liveState && liveState.status) {
        liveScore = liveState.score;
        liveMinute = liveState.minute;
        if (liveState.status.includes("finished") || liveState.status === "f") {
          currentStatus = "finished";
          liveScore = await getFinishedMatchScore(match.id).catch(() => liveScore);
          liveMinute = null;
        }
      } else {
        // If liveState is null or status is empty, it means the match is finished (missing from active snapshot)
        currentStatus = "finished";
        liveScore = await getFinishedMatchScore(match.id).catch(() => liveScore);
        liveMinute = null;
      }
    } catch (err) {
      console.error("[MatchPage] Failed to fetch live match state:", err);
    }
  } else if (match.status === "finished") {
    try {
      liveScore = await getFinishedMatchScore(match.id).catch(() => liveScore);
      liveMinute = null;
    } catch (err) {
      console.error("[MatchPage] Failed to fetch historical score:", err);
    }
  }

  const isLive = currentStatus === "live";
  const isFinished = currentStatus === "finished";

  // 2. Fetch latest live win-probabilities
  let pHome = match.pPreMatch?.home ?? 0.33;
  let pDraw = match.pPreMatch?.draw ?? 0.34;
  let pAway = match.pPreMatch?.away ?? 0.33;

  try {
    const liveProbs = await getPrematchProbabilities(match.id);
    if (liveProbs) {
      pHome = liveProbs.pHome;
      pDraw = liveProbs.pDraw;
      pAway = liveProbs.pAway;
    }
  } catch (err) {
    console.error("[MatchPage] Failed to fetch live probabilities:", err);
  }

  return (
    <>
      <Navbar displayName={displayName} />
      <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Match header */}
      <div className="mb-8 bg-surface-raised border border-surface-border p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            FIFA World Cup
          </span>
          {isLive ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-tier-notable bg-tier-notable/10 px-2.5 py-1 rounded-full border border-tier-notable/20">
              <span className="h-1.5 w-1.5 rounded-full bg-tier-notable animate-pulse" />
              {copy.fixtures.live}
            </span>
          ) : isFinished ? (
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider bg-surface-border/50 px-2.5 py-1 rounded-full">
              Finished
            </span>
          ) : (
            <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider bg-surface-border/30 px-2.5 py-1 rounded-full">
              Scheduled
            </span>
          )}
        </div>

        {/* Teams and Score Grid */}
        <div className="flex items-center justify-between gap-4">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <Avatar name={match.home} />
            <h1 className="font-display text-base sm:text-lg font-bold text-ink-primary text-center">
              {match.home}
            </h1>
          </div>

          {/* Score / Divider */}
          <div className="flex flex-col items-center justify-center min-w-[80px]">
            {isLive || isFinished ? (
              <>
                <div className="font-display text-4xl font-extrabold tracking-tight text-ink-primary">
                  {liveScore.home}
                  <span className="text-ink-muted text-2xl mx-1.5">–</span>
                  {liveScore.away}
                </div>
                {isLive && liveMinute !== null && (
                  <div className="text-xs font-semibold text-tier-notable mt-1 animate-pulse">
                    {liveMinute}'
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center">
                <span className="font-display text-base font-bold text-ink-primary">
                  {kickoffTime}
                </span>
                <span className="text-[9px] text-ink-secondary mt-0.5 tracking-wider uppercase">
                  {kickoffDate}
                </span>
              </div>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <Avatar name={match.away} />
            <h1 className="font-display text-base sm:text-lg font-bold text-ink-primary text-center">
              {match.away}
            </h1>
          </div>
        </div>
      </div>

      {/* Probability bar — Implements FR-1.2 */}
      {(isLive || isFinished) && (
        <div className="mb-8">
          <ProbabilityBar
            home={match.home}
            away={match.away}
            pHome={pHome}
            pDraw={pDraw}
            pAway={pAway}
          />
        </div>
      )}

      {/* Check-in button — FR-2.1 */}
      {!isFinished && (
        <div className="mb-10">
          <CheckinButton matchId={match.id} initialCheckedIn={isWitness} />
        </div>
      )}

      {/* Live Moment notifications — FR-5.1 */}
      <WitnessNotifications matchId={match.id} isWitness={isWitness} />

      {/* Moments for this match */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-secondary mb-4 border-b border-surface-border/40 pb-2">
          Match Moments ({moments.length})
        </h2>
        {moments.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            {moments.map(moment => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-surface-border/30 border-dashed rounded-xl">
            <p className="text-sm text-ink-muted">
              No game-defining moments have occurred yet. Check back during live events!
            </p>
          </div>
        )}
      </section>
    </main>
  </>
  );
}
