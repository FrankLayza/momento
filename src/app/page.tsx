/**
 * src/app/page.tsx
 * Fixtures homepage — Implements FR-1.1 (PRD) & visual direction from Linear.app (§12).
 * Displays a clean, high-density listing of live and upcoming World Cup matches.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { copy } from "@/lib/copy";
import { listMatches, getUserCheckins } from "@/server/db/queries";
import { listWorldCupMatches } from "@/server/txline/adapter";
import { createClient } from "@/utils/supabase/server";
import type { Match } from "@/lib/types";

export const metadata: Metadata = {
  title: "Fixtures | Momento",
};

export const revalidate = 10; // ISR: refresh fixture data every 10 seconds for high-density live updates

export default async function FixturesPage() {
  // 1. Get current auth user session
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch user check-ins if logged in
  let userCheckins = new Set<string>();
  if (user) {
    try {
      const checkins = await getUserCheckins(user.id);
      userCheckins = new Set(checkins.map(c => c.matchId));
    } catch (err) {
      console.error("[FixturesPage] Failed to load user check-ins:", err);
    }
  }

  // 3. Fetch matches from database
  let dbMatches: Match[] = [];
  try {
    dbMatches = await listMatches();
  } catch (err) {
    console.error("[FixturesPage] Failed to load matches from DB:", err);
  }

  // 4. Fetch live feed from TxLINE to merge real-time scores and minutes
  let liveTxMatches: any[] = [];
  try {
    liveTxMatches = await listWorldCupMatches();
  } catch (err) {
    console.error("[FixturesPage] Failed to load live matches from TxLINE:", err);
  }

  // 5. Merge scores and minutes for live matches
  const matches = dbMatches.map(m => {
    if (m.status === "live") {
      const txMatch = liveTxMatches.find(tm => tm.id === m.id);
      if (txMatch) {
        return {
          ...m,
          score: txMatch.score,
          minute: txMatch.minute,
        };
      }
    } else if (m.status === "finished") {
      const txMatch = liveTxMatches.find(tm => tm.id === m.id);
      if (txMatch) {
        return {
          ...m,
          score: txMatch.score,
        };
      }
    }
    return m;
  });

  const liveMatches     = matches.filter(m => m.status === "live");
  const upcomingMatches = matches.filter(m => m.status === "scheduled");
  const finishedMatches = matches.filter(m => m.status === "finished");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      {/* Welcome Banner */}
      <div className="mb-10 text-center sm:text-left">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink-primary">
          {copy.appName}
        </h1>
        <p className="mt-2 text-sm text-ink-secondary max-w-md leading-relaxed">
          {copy.tagline}
        </p>
      </div>

      {/* Live matches section */}
      {liveMatches.length > 0 && (
        <section className="mb-10">
          <SectionHeader label={copy.fixtures.live} live />
          <div className="space-y-3">
            {liveMatches.map(m => (
              <MatchRow key={m.id} match={m} isWitness={userCheckins.has(m.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming matches section */}
      {upcomingMatches.length > 0 && (
        <section className="mb-10">
          <SectionHeader label={copy.fixtures.upcoming} />
          <div className="space-y-3">
            {upcomingMatches.map(m => (
              <MatchRow key={m.id} match={m} isWitness={userCheckins.has(m.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Finished matches section */}
      {finishedMatches.length > 0 && (
        <section className="mb-10">
          <SectionHeader label="Finished" />
          <div className="space-y-3">
            {finishedMatches.map(m => (
              <MatchRow key={m.id} match={m} isWitness={userCheckins.has(m.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="text-center py-20 border border-surface-border/50 rounded-2xl bg-surface-raised/30">
          <p className="text-sm text-ink-muted">
            {copy.fixtures.noFixtures}
          </p>
        </div>
      )}
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ label, live = false }: { label: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-4 border-b border-surface-border/40 pb-2">
      {live && (
        <span className="h-2 w-2 rounded-full bg-tier-notable animate-pulse" />
      )}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-secondary">
        {label}
      </h2>
    </div>
  );
}

function MatchRow({ match, isWitness }: { match: Match; isWitness: boolean }) {
  const kickoff = new Date(match.kickoffUtc).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const kickoffDate = new Date(match.kickoffUtc).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <Link
      href={`/match/${match.id}`}
      className="group flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-5 py-4 transition-all duration-150 hover:border-tier-notable/30 hover:bg-surface-overlay"
    >
      {/* Teams Grid */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Home Team */}
        <div className="flex-1 text-right truncate">
          <span className="font-display text-sm font-semibold text-ink-primary group-hover:text-white transition-colors">
            {match.home}
          </span>
        </div>

        {/* Live Score or Time */}
        <div className="flex flex-col items-center justify-center w-20 flex-shrink-0">
          {isLive ? (
            <>
              <div className="font-display text-base font-extrabold text-tier-notable tracking-tight">
                {match.score.home} – {match.score.away}
              </div>
              {match.minute !== null && (
                <div className="text-[10px] text-tier-notable font-semibold tracking-wider animate-pulse mt-0.5">
                  {match.minute}'
                </div>
              )}
            </>
          ) : isFinished ? (
            <div className="font-display text-base font-bold text-ink-secondary tracking-tight">
              {match.score.home} – {match.score.away}
            </div>
          ) : (
            <>
              <div className="font-display text-sm font-bold text-ink-primary">
                {kickoff}
              </div>
              <div className="text-[9px] text-ink-muted tracking-wider mt-0.5">
                {kickoffDate}
              </div>
            </>
          )}
        </div>

        {/* Away Team */}
        <div className="flex-1 text-left truncate">
          <span className="font-display text-sm font-semibold text-ink-primary group-hover:text-white transition-colors">
            {match.away}
          </span>
        </div>
      </div>

      {/* Check-in / Witness Badge */}
      <div className="flex-shrink-0 pl-4 border-l border-surface-border/50 ml-4 min-w-[70px] text-right">
        {isWitness ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-tier-notable bg-tier-notable/10 px-2 py-0.5 rounded-md border border-tier-notable/20">
            ✓ Witness
          </span>
        ) : isLive ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted group-hover:text-ink-secondary transition-colors">
            Check In
          </span>
        ) : isFinished ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            Closed
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-ink-muted">
            Upcoming
          </span>
        )}
      </div>
    </Link>
  );
}
