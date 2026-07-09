/**
 * src/app/leaderboard/page.tsx
 * Global leaderboard — ranked by cumulative shock score of claimed Moments.
 * Implements FR-7.1 (PRD) & visual direction from Linear.app (§12).
 */

import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { getLeaderboard } from "@/server/db/queries";

export const metadata: Metadata = {
  title: `${copy.leaderboard.title} | Momento`,
};

export const revalidate = 60; // 1-minute ISR for active tournaments

export default async function LeaderboardPage() {
  const rows = await getLeaderboard(50).catch(
    () => [] as Awaited<ReturnType<typeof getLeaderboard>>
  );

  const top3 = rows.slice(0, 3);
  const remaining = rows.slice(3);

  // Pad top 3 if they don't exist
  const podium = [
    top3[1] || null, // 2nd place (left)
    top3[0] || null, // 1st place (center)
    top3[2] || null, // 3rd place (right)
  ];

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-primary">
          {copy.leaderboard.title}
        </h1>
        <p className="mt-2 text-xs text-ink-secondary uppercase tracking-widest font-semibold">
          Top witnesses by cumulative shock rating
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-20 border border-surface-border/50 rounded-2xl bg-surface-raised/30">
          <p className="text-sm text-ink-muted">
            No claims yet — check in to a match to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Podium layout */}
          <div className="flex items-end justify-center gap-4 mb-10 mt-6 min-h-[160px]">
            {/* 2nd Place */}
            {podium[0] && (
              <div className="flex flex-col items-center flex-1">
                <span className="font-display text-base font-bold text-tier-notable">
                  🥈
                </span>
                <span className="text-xs text-ink-primary font-semibold mt-1 truncate max-w-[100px]">
                  {podium[0].displayName}
                </span>
                <span className="font-display text-sm font-extrabold text-ink-secondary mt-0.5">
                  {podium[0].totalShockScore}
                </span>
                <div className="w-full bg-surface-raised border-t border-x border-surface-border rounded-t-xl h-16 mt-3 flex items-center justify-center">
                  <span className="font-display text-sm font-extrabold text-ink-muted">2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {podium[1] && (
              <div className="flex flex-col items-center flex-1">
                <span className="font-display text-xl font-bold text-tier-shock">
                  👑
                </span>
                <span className="text-sm text-ink-primary font-bold mt-1 truncate max-w-[120px]">
                  {podium[1].displayName}
                </span>
                <span className="font-display text-base font-black text-tier-shock mt-0.5">
                  {podium[1].totalShockScore}
                </span>
                <div className="w-full bg-surface-overlay border-t border-x border-tier-shock/30 rounded-t-xl h-24 mt-3 flex items-center justify-center shadow-[0_0_24px_theme(colors.tier.shock.DEFAULT/10)]">
                  <span className="font-display text-lg font-black text-tier-shock">1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {podium[2] && (
              <div className="flex flex-col items-center flex-1">
                <span className="font-display text-base font-bold text-tier-seismic">
                  🥉
                </span>
                <span className="text-xs text-ink-primary font-semibold mt-1 truncate max-w-[100px]">
                  {podium[2].displayName}
                </span>
                <span className="font-display text-sm font-extrabold text-ink-secondary mt-0.5">
                  {podium[2].totalShockScore}
                </span>
                <div className="w-full bg-surface-raised border-t border-x border-surface-border rounded-t-xl h-12 mt-3 flex items-center justify-center">
                  <span className="font-display text-sm font-extrabold text-ink-muted">3</span>
                </div>
              </div>
            )}
          </div>

          {/* Remaining list */}
          {remaining.length > 0 && (
            <div className="space-y-2">
              <div className="flex text-[10px] font-semibold uppercase tracking-widest text-ink-muted px-4 mb-2">
                <span className="w-10">{copy.leaderboard.rankCol}</span>
                <span className="flex-1">{copy.leaderboard.userCol}</span>
                <span className="text-right">{copy.leaderboard.scoreCol}</span>
              </div>
              
              {remaining.map((row, i) => (
                <div
                  key={row.userId}
                  className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3.5 transition-colors hover:bg-surface-overlay"
                >
                  {/* Rank */}
                  <span className="font-display text-xs w-10 text-ink-muted font-bold">
                    {i + 4}
                  </span>

                  {/* Display name */}
                  <span className="flex-1 text-xs text-ink-primary font-semibold truncate">
                    {row.displayName}
                  </span>

                  {/* Score */}
                  <span className="font-display text-sm font-bold text-ink-primary">
                    {row.totalShockScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
