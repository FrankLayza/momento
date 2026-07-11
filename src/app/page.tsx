/**
 * src/app/page.tsx
 * Fixtures homepage — Implements FR-1.1 (PRD) & visual direction from FotMob / Linear.app.
 * Renders a high-density, professional fixtures dashboard with unified groupings.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { copy } from "@/lib/copy";
import { listMatches, getUserCheckins, getUserById } from "@/server/db/queries";
import { listWorldCupMatches, getFinishedMatchScore } from "@/server/txline/adapter";
import { createClient } from "@/utils/supabase/server";
import { Avatar } from "@/components/Avatar";
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

  // 2. Fetch user details and check-ins if logged in
  let userCheckins = new Set<string>();
  let userDisplayName = "";
  if (user) {
    try {
      const [checkins, appUser] = await Promise.all([
        getUserCheckins(user.id),
        getUserById(user.id),
      ]);
      userCheckins = new Set(checkins.map(c => c.matchId));
      // Never fall back to the raw email — fan-facing UI shows a name only.
      userDisplayName = appUser?.displayName || user.email?.split("@")[0] || "Fan";
    } catch (err) {
      console.error("[FixturesPage] Failed to load user metadata:", err);
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

  // 5. Merge scores and minutes for live/finished matches
  const matches = await Promise.all(
    dbMatches.map(async m => {
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
        // Query final score dynamically from TxLINE historical data
        const score = await getFinishedMatchScore(m.id).catch(() => ({ home: 0, away: 0 }));
        return {
          ...m,
          score,
        };
      }
      return m;
    })
  );

  const liveMatches     = matches.filter(m => m.status === "live");
  const upcomingMatches = matches.filter(m => m.status === "scheduled");
  const finishedMatches = matches.filter(m => m.status === "finished");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Header and User Profile Bar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-surface-border pb-6 mb-8 gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            FIFA World Cup 2026
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-primary mt-1">
            Fixtures
          </h1>
          <p className="mt-1.5 text-xs text-ink-secondary max-w-md leading-relaxed">
            Witness game-defining moments live and claim your limited-edition match keepsakes.
          </p>
        </div>
      </div>

      {/* Live matches section */}
      {liveMatches.length > 0 && (
        <section className="mb-8">
          <SectionHeader label={copy.fixtures.live} live />
          <MatchesContainer>
            {liveMatches.map((m, idx) => (
              <MatchRow
                key={m.id}
                match={m}
                isWitness={userCheckins.has(m.id)}
                isFirst={idx === 0}
              />
            ))}
          </MatchesContainer>
        </section>
      )}

      {/* Upcoming matches section */}
      {upcomingMatches.length > 0 && (
        <section className="mb-8">
          <SectionHeader label={copy.fixtures.upcoming} />
          <MatchesContainer>
            {upcomingMatches.map((m, idx) => (
              <MatchRow
                key={m.id}
                match={m}
                isWitness={userCheckins.has(m.id)}
                isFirst={idx === 0}
              />
            ))}
          </MatchesContainer>
        </section>
      )}

      {/* Finished matches section */}
      {finishedMatches.length > 0 && (
        <section className="mb-8">
          <SectionHeader label="Finished" />
          <MatchesContainer>
            {finishedMatches.map((m, idx) => (
              <MatchRow
                key={m.id}
                match={m}
                isWitness={userCheckins.has(m.id)}
                isFirst={idx === 0}
              />
            ))}
          </MatchesContainer>
        </section>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="text-center py-16 border border-surface-border border-dashed rounded-lg bg-surface-raised/20">
          <p className="text-xs text-ink-muted">
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
    <div className="flex items-center gap-1.5 mb-2.5 px-1">
      {live && (
        <span className="h-1.5 w-1.5 rounded-full bg-tier-notable animate-pulse" />
      )}
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-ink-secondary">
        {label}
      </h2>
    </div>
  );
}

function MatchesContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden shadow-sm">
      {children}
    </div>
  );
}

function MatchRow({ match, isWitness, isFirst }: { match: Match; isWitness: boolean; isFirst: boolean }) {
  const kickoffTime = new Date(match.kickoffUtc).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const kickoffDate = new Date(match.kickoffUtc).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <Link
      href={`/match/${match.id}`}
      className={`group flex items-center justify-between px-4 py-3.5 transition-colors duration-150 hover:bg-surface-overlay/50 ${
        !isFirst ? "border-t border-surface-border/50" : ""
      }`}
    >
      {/* Home Team */}
      <div className="flex-1 flex items-center justify-end gap-2 pr-4 min-w-0">
        <span className="font-body text-xs font-medium text-ink-primary group-hover:text-white transition-colors truncate">
          {match.home}
        </span>
        <Avatar name={match.home} size="sm" />
      </div>

      {/* Match Center: Score or Kickoff Time */}
      <div className="flex flex-col items-center justify-center w-24 flex-shrink-0 py-0.5 px-2 bg-surface rounded border border-surface-border/50">
        {isLive ? (
          <>
            <span className="font-display text-sm font-bold text-tier-notable tracking-tight">
              {match.score.home} – {match.score.away}
            </span>
            {match.minute !== null && (
              <span className="text-[9px] text-tier-notable font-semibold tracking-wide animate-pulse mt-0.5">
                {match.minute}'
              </span>
            )}
          </>
        ) : isFinished ? (
          <span className="font-display text-xs font-semibold text-ink-secondary tracking-tight">
            {match.score.home} – {match.score.away}
          </span>
        ) : (
          <>
            <span className="font-display text-xs font-bold text-ink-primary">
              {kickoffTime}
            </span>
            <span className="text-[8px] text-ink-muted tracking-wide mt-0.5">
              {kickoffDate}
            </span>
          </>
        )}
      </div>

      {/* Away Team */}
      <div className="flex-1 flex items-center justify-start gap-2 pl-4 min-w-0">
        <Avatar name={match.away} size="sm" />
        <span className="font-body text-xs font-medium text-ink-primary group-hover:text-white transition-colors truncate">
          {match.away}
        </span>
      </div>

      {/* Check-in / Witness Badge */}
      <div className="flex-shrink-0 w-24 text-right pl-3 border-l border-surface-border/30 ml-3">
        {isWitness ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-tier-notable bg-tier-notable/5 px-2 py-0.5 rounded border border-tier-notable/10">
            ✓ Witnessed
          </span>
        ) : isLive ? (
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted group-hover:text-ink-secondary transition-colors">
            Check In
          </span>
        ) : isFinished ? (
          <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">
            Closed
          </span>
        ) : (
          <span className="text-[9px] font-semibold text-ink-muted">
            Upcoming
          </span>
        )}
      </div>
    </Link>
  );
}
