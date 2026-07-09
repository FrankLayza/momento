/**
 * src/app/vault/page.tsx
 * User's Vault — their claimed Moments as a card grid.
 * Implements FR-5.4 (PRD).
 */

import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import type { Edition, Moment } from "@/lib/types";

export const metadata: Metadata = {
  title: copy.vault.title,
};

// NOTE: auth integration done in Days 7-9.
// For now this is a structural stub.

export default async function VaultPage() {
  // TODO: get userId from Supabase session cookie
  // const { userId } = await getServerSession();
  // const editions = await getUserEditions(userId);

  const editions: Edition[]  = [];
  const moments:  Moment[]   = [];  // TODO: fetch via edition → moment join

  const totalMoments      = moments.length;
  const rarestTier        = getRarestTier(moments);
  const matchesWitnessed  = 0; // TODO: count distinct matchIds in editions

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <h1 className="font-display text-3xl font-bold mb-2">{copy.vault.title}</h1>

      {/* Stats bar */}
      {totalMoments > 0 && (
        <div className="flex gap-6 text-sm text-ink-secondary mb-8">
          <span>{copy.vault.totalMoments(totalMoments)}</span>
          {rarestTier && <span>{copy.vault.rarestTier(rarestTier)}</span>}
          <span>{copy.vault.matchesWitnessed(matchesWitnessed)}</span>
        </div>
      )}

      {/* Empty state */}
      {totalMoments === 0 && (
        <div className="text-center py-24">
          <p className="text-ink-muted text-sm">{copy.vault.empty}</p>
        </div>
      )}

      {/* Sort controls — placeholder */}
      {totalMoments > 0 && (
        <div className="flex gap-2 mb-6">
          <SortButton label={copy.vault.sortByScore} active />
          <SortButton label={copy.vault.sortByDate} />
        </div>
      )}

      {/* Card grid */}
      {totalMoments > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {moments.map(moment => (
            <div key={moment.id} className="aspect-card">
              {/* MomentCard imported lazily to avoid circular deps at scaffold time */}
              <div className="w-full h-full rounded-2xl bg-surface-raised border border-surface-border flex items-center justify-center">
                <span className="font-display text-xs text-ink-muted">
                  {moment.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function SortButton({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <button
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-surface-overlay text-ink-primary"
          : "text-ink-muted hover:text-ink-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function getRarestTier(moments: Moment[]): string | null {
  const order = ["Seismic", "Shock", "Notable", "Common"];
  for (const tier of order) {
    if (moments.some(m => m.tier === tier)) return tier;
  }
  return null;
}
