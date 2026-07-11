/**
 * src/app/m/[momentId]/page.tsx
 * Public Moment page with Open Graph tags.
 * Implements FR-6.2, FR-6.3 (PRD).
 *
 * Non-witnesses see the FOMO copy and next fixtures (FR-6.3).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getMomentById, listMatches } from "@/server/db/queries";
import { copy } from "@/lib/copy";
import { MomentCard } from "@/components/MomentCard";
import { TierBadge } from "@/components/TierBadge";
import type { Moment, Match } from "@/lib/types";

interface Props {
  params: { momentId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const moment = await getMomentById(params.momentId).catch(() => null);
  if (!moment) return { title: "Moment not found" };

  const ogImageUrl = `/api/og/${params.momentId}`;
  const title      = `Shock rating: ${moment.shockScore}/100 — ${moment.tier}`;
  const description = copy.moment.witnessCount(moment.witnessCount);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1080, height: 1350 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicMomentPage({ params }: Props) {
  const moment  = await getMomentById(params.momentId).catch(() => null as Moment | null);
  const matches = await listMatches().catch(() => [] as Match[]);

  if (!moment) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-ink-muted">{copy.errors.notFound}</p>
      </main>
    );
  }

  const match       = matches.find(m => m.id === moment.matchId);
  const upcomingMatches = matches.filter(m => m.status !== "finished").slice(0, 3);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      {/* Moment card — centred, full display */}
      <div className="w-56 mx-auto mb-8">
        <MomentCard moment={moment} />
      </div>

      {/* Tier badge */}
      <div className="flex justify-center mb-4">
        <TierBadge tier={moment.tier} />
      </div>

      {/* Headline */}
      <h1 className="font-display text-center text-2xl font-bold mb-2">
        {copy.moment.marketChance(Math.round((1 - moment.pBefore.home) * 100))}
      </h1>
      <p className="text-center text-sm text-ink-secondary mb-6">
        {copy.moment.witnessCount(moment.witnessCount)}
      </p>

      {/* FOMO line for non-witnesses (FR-6.3) */}
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-6 text-center mb-8">
        <p className="text-sm text-ink-secondary mb-1">
          {copy.publicMoment.notWitness}
        </p>
        <p className="text-xs text-ink-muted">
          {copy.publicMoment.fomoLine}
        </p>
      </div>

      {/* Next fixtures CTA */}
      {upcomingMatches.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3 text-center">
            {copy.publicMoment.joinNext}
          </p>
          <div className="space-y-2">
            {upcomingMatches.map(m => (
              <Link
                key={m.id}
                href={`/match/${m.id}`}
                className="flex items-center justify-between rounded-xl border border-surface-border bg-surface-raised px-4 py-3 hover:bg-surface-overlay transition-colors"
              >
                <span className="font-display text-sm font-semibold">
                  {m.home} <span className="text-ink-muted font-normal">v</span> {m.away}
                </span>
                <span className="text-xs text-ink-secondary">{copy.checkin.action} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
