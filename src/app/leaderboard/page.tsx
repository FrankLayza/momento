/**
 * src/app/leaderboard/page.tsx
 * Global leaderboard — ranked by cumulative shock score.
 * Implements FR-7.1 (PRD).
 */

import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { getLeaderboard } from "@/server/db/queries";

export const metadata: Metadata = { title: copy.leaderboard.title };
export const revalidate = 300; // 5-minute ISR

export default async function LeaderboardPage() {
  const rows = await getLeaderboard(50).catch(() => [] as Awaited<ReturnType<typeof getLeaderboard>>);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold mb-8">{copy.leaderboard.title}</h1>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-ink-muted py-16">
          No claims yet — check in to a match to get started.
        </p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div
              key={row.userId}
              className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
            >
              {/* Rank */}
              <span className="font-display text-sm w-8 text-ink-muted font-semibold">
                {i + 1}
              </span>

              {/* Display name */}
              <span className="flex-1 text-sm text-ink-primary font-semibold truncate">
                {row.displayName}
              </span>

              {/* Score */}
              <span className="font-display text-lg font-bold text-ink-primary">
                {row.totalShockScore}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
