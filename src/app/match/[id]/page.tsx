/**
 * src/app/match/[id]/page.tsx
 * Live match page with probability bar + check-in.
 * Implements FR-1.2, FR-2.1 (PRD).
 */

import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { getMomentsForMatch, listMatches } from "@/server/db/queries";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { MomentCard } from "@/components/MomentCard";
import { CheckinButton } from "@/components/CheckinButton";
import type { Match, Moment } from "@/lib/types";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const matches = await listMatches().catch(() => [] as Match[]);
  const match   = matches.find(m => m.id === params.id);
  if (!match) return { title: "Match" };
  return { title: `${match.home} v ${match.away}` };
}

export const revalidate = 30;

export default async function MatchPage({ params }: Props) {
  const matches = await listMatches().catch(() => [] as Match[]);
  const match   = matches.find(m => m.id === params.id);
  const moments = await getMomentsForMatch(params.id).catch(() => [] as Moment[]);

  if (!match) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-ink-muted">{copy.errors.notFound}</p>
      </main>
    );
  }

  const isLive = match.status === "live";

  // Probability stub — will be live via Supabase Realtime in Days 7-9
  const pHome = match.pPreMatch?.home ?? 0.33;
  const pDraw = match.pPreMatch?.draw ?? 0.34;
  const pAway = match.pPreMatch?.away ?? 0.33;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Match header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">
            {match.home} <span className="text-ink-muted font-normal text-lg">v</span> {match.away}
          </h1>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-tier-notable">
              <span className="h-1.5 w-1.5 rounded-full bg-tier-notable animate-pulse" />
              {copy.fixtures.live}
            </span>
          )}
        </div>

        {isLive && (
          <div className="mt-1 font-display text-5xl font-bold tracking-tight">
            {match.score.home}
            <span className="text-ink-muted text-3xl mx-2">–</span>
            {match.score.away}
          </div>
        )}
      </div>

      {/* Probability bar — Implements FR-1.2 */}
      {isLive && (
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
      {match.status !== "finished" && (
        <div className="mb-8">
          <CheckinButton matchId={match.id} />
        </div>
      )}

      {/* Moments for this match */}
      {moments.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">
            Moments
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {moments.map(moment => (
              <MomentCard key={moment.id} moment={moment} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
