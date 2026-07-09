/**
 * src/app/page.tsx
 * Fixtures home screen — Implements FR-1.1 (PRD).
 *
 * Lists today's and upcoming World Cup fixtures.
 * Links to live match pages.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/lib/copy";
import { listMatches } from "@/server/db/queries";
import type { Match } from "@/lib/types";

export const metadata: Metadata = {
  title: "Fixtures",
};

export const revalidate = 60; // ISR: refresh fixture data every 60 seconds

export default async function FixturesPage() {
  let matches: Match[] = [];
  try {
    matches = await listMatches();
  } catch {
    // DB not yet connected — show empty state gracefully
  }

  const live      = matches.filter(m => m.status === "live");
  const upcoming  = matches.filter(m => m.status === "scheduled");
  const finished  = matches.filter(m => m.status === "finished");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-primary">
          {copy.appName}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">{copy.tagline}</p>
      </div>

      {/* Live matches */}
      {live.length > 0 && (
        <section className="mb-8">
          <SectionHeader label={copy.fixtures.live} live />
          <div className="space-y-2">
            {live.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Today's / upcoming */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <SectionHeader label={copy.fixtures.upcoming} />
          <div className="space-y-2">
            {upcoming.map(m => <MatchRow key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <p className="text-center text-sm text-ink-muted py-16">
          {copy.fixtures.noFixtures}
        </p>
      )}
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ label, live = false }: { label: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {live && (
        <span className="h-2 w-2 rounded-full bg-tier-notable animate-pulse" />
      )}
      <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        {label}
      </h2>
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const kickoff = new Date(match.kickoffUtc).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const isLive = match.status === "live";

  return (
    <Link
      href={`/match/${match.id}`}
      className="group flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3 transition-colors hover:border-surface-overlay hover:bg-surface-overlay"
    >
      {/* Teams */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="text-right w-24 truncate">
          <span className="font-display text-sm font-semibold text-ink-primary group-hover:text-white transition-colors">
            {match.home}
          </span>
        </div>

        {/* Score / vs */}
        <div className="font-display text-xs font-bold text-ink-muted w-12 text-center flex-shrink-0">
          {isLive
            ? `${match.score.home} – ${match.score.away}`
            : "vs"}
        </div>

        <div className="text-left w-24 truncate">
          <span className="font-display text-sm font-semibold text-ink-primary group-hover:text-white transition-colors">
            {match.away}
          </span>
        </div>
      </div>

      {/* Right side: kickoff / live indicator */}
      <div className="flex-shrink-0 text-right ml-4">
        {isLive ? (
          <span className="text-xs font-semibold text-tier-notable">
            {copy.fixtures.live}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">{kickoff}</span>
        )}
      </div>
    </Link>
  );
}
