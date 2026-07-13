/**
 * src/app/vault/page.tsx
 * User's Vault — displays their claimed Moments as a premium card grid.
 * Implements FR-5.4 (PRD).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { copy } from "@/lib/copy";
import { getUserMoments, getUserById } from "@/server/db/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MomentCard } from "@/components/MomentCard";
import { Navbar } from "@/components/Navbar";
import type { Moment } from "@/lib/types";

export const metadata: Metadata = {
  title: `${copy.vault.title} | Momento`,
};

export const revalidate = 0; // Dynamic/SSR only to always reflect latest claims

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  // 1. Get current auth user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?next=/vault&reason=vault');
  }

  // 2. Fetch claimed moments for the user
  let userMoments: Array<{ edition: any; moment: Moment }> = [];
  let displayName = "Fan";
  try {
    const [momentsRes, appUser] = await Promise.all([
      getUserMoments(user.id),
      getUserById(user.id).catch(() => null),
    ]);
    userMoments = momentsRes;
    displayName = appUser?.displayName || user.email?.split("@")[0] || "Fan";
  } catch (err) {
    console.error("[VaultPage] Failed to fetch user moments / metadata:", err);
  }

  const totalMoments = userMoments.length;

  // Calculate unique matches witnessed
  const uniqueMatchIds = new Set(userMoments.map(um => um.moment.matchId));
  const matchesWitnessed = uniqueMatchIds.size;

  // Find rarest tier claimed
  const moments = userMoments.map(um => um.moment);
  const rarestTier = getRarestTier(moments);

  // 3. Sort moments based on query param
  const resolvedSearchParams = await searchParams;
  const sortBy = resolvedSearchParams.sort === "score" ? "score" : "date";
  const sortedMoments = [...moments].sort((a, b) => {
    if (sortBy === "score") {
      return b.shockScore - a.shockScore;
    } else {
      return new Date(b.eventUtc).getTime() - new Date(a.eventUtc).getTime();
    }
  });

  return (
    <>
      <Navbar displayName={displayName} userId={user.id} />
      <main className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {copy.vault.title}
        </h1>
        
        {/* Stats bar */}
        {totalMoments > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-ink-secondary uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-tier-notable" />
              {copy.vault.totalMoments(totalMoments)}
            </span>
            {rarestTier && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-tier-shock" />
                {copy.vault.rarestTier(rarestTier)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-tier-seismic" />
              {copy.vault.matchesWitnessed(matchesWitnessed)}
            </span>
          </div>
        )}
      </div>

      {/* Sort controls */}
      {totalMoments > 0 && (
        <div className="mb-6 flex gap-2 pb-3">
          <Link
            href="/vault?sort=date"
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              sortBy === "date"
                ? "bg-cream-surface border border-cream-border text-ink"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            {copy.vault.sortByDate}
          </Link>
          <Link
            href="/vault?sort=score"
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              sortBy === "score"
                ? "bg-cream-surface border border-cream-border text-ink"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            {copy.vault.sortByScore}
          </Link>
        </div>
      )}

      {/* Card grid */}
      {totalMoments > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {sortedMoments.map(moment => (
            <MomentCard key={moment.id} moment={moment} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 border border-cream-border border-dashed rounded-2xl bg-cream-surface/30">
          <p className="text-sm text-ink-secondary leading-relaxed max-w-sm mx-auto">
            {copy.vault.empty}
          </p>
        </div>
      )}
    </main>
  </>
  );
}

function getRarestTier(moments: Moment[]): string | null {
  const order = ["Seismic", "Shock", "Notable", "Common"];
  for (const tier of order) {
    if (moments.some(m => m.tier === tier)) return tier;
  }
  return null;
}
