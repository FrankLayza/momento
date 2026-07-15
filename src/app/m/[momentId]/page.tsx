/**
 * src/app/m/[momentId]/page.tsx
 * Public Moment page with Open Graph tags.
 * Implements FR-6.2, FR-6.3 (PRD).
 *
 * Non-witnesses see the FOMO copy and next fixtures (FR-6.3).
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { getMomentById, listMatches, getUserById } from "@/server/db/queries";
import { copy } from "@/lib/copy";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { MomentCard } from "@/components/MomentCard";
import { TierBadge } from "@/components/TierBadge";
import type { Moment, Match } from "@/lib/types";

interface Props {
  params: Promise<{ momentId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { momentId } = await params;
  const moment = await getMomentById(momentId).catch(() => null);
  if (!moment) return { title: "Moment not found" };

  const ogImageUrl = `/api/og/${momentId}`;
  const title = `Shock rating: ${moment.shockScore}/100 — ${moment.tier}`;
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
  const { momentId } = await params;
  const moment = await getMomentById(momentId).catch(() => null as Moment | null);
  const matches = await listMatches().catch(() => [] as Match[]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let displayName = "Fan";
  if (user) {
    try {
      const appUser = await getUserById(user.id).catch(() => null);
      displayName = appUser?.displayName || user.email?.split("@")[0] || "Fan";
    } catch (err) {
      console.error("[PublicMomentPage] Failed to fetch user profile:", err);
    }
  }

  if (!moment) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-ink-secondary">{copy.errors.notFound}</p>
      </main>
    );
  }

  const match = matches.find(m => m.id === moment.matchId);
  const upcomingMatches = matches.filter(m => m.status !== "finished").slice(0, 3);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-cream relative overflow-hidden font-body selection:bg-cyan/30">
      {/* Immersive radial spotlight */}
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[800px] pointer-events-none opacity-60"
        style={{
          background: moment.tier === 'Seismic' ? 'radial-gradient(ellipse at center, rgba(225,29,72,0.15), transparent 60%)' :
            moment.tier === 'Shock' ? 'radial-gradient(ellipse at center, rgba(217,119,6,0.15), transparent 60%)' :
              'radial-gradient(ellipse at center, rgba(255,255,255,0.05), transparent 60%)'
        }}
      />

      <div className="relative z-10 mix-blend-difference">
        <Navbar displayName={displayName} userId={user?.id ?? null} />
      </div>

      <main className="relative z-10 mx-auto max-w-lg px-4 py-16 flex flex-col items-center">
        {/* Moment card — floating animation */}
        <div className="w-64 mx-auto mb-10 animate-float" style={{ animationDuration: '4s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}>
          <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .animate-float { animation-name: float; }
        `}</style>
          <MomentCard moment={moment} featured matchDetails={match ? { home: match.home, away: match.away } : undefined} />
        </div>

        {/* Tier badge */}
        <div className="flex justify-center mb-6">
          <TierBadge tier={moment.tier} size="md" />
        </div>

        {/* Headline */}
        <h1 className="font-display text-center text-3xl font-extrabold mb-2 text-white drop-shadow-sm tracking-tight">
          {copy.moment.marketChance(Math.round((1 - moment.pBefore.home) * 100))}
        </h1>
        <p className="text-center text-[13px] font-medium text-white/50 mb-10 uppercase tracking-[0.2em]">
          {copy.moment.witnessCount(moment.witnessCount)}
        </p>

        {/* FOMO line for non-witnesses (FR-6.3) */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center mb-10 shadow-xl">
          <p className="text-[15px] font-semibold text-white mb-2 leading-snug">
            {copy.publicMoment.notWitness}
          </p>
          <p className="text-[13px] text-white/60 leading-relaxed max-w-[280px] mx-auto">
            {copy.publicMoment.fomoLine}
          </p>
        </div>

        {/* Next fixtures CTA */}
        {upcomingMatches.length > 0 && (
          <section className="w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-4 text-center">
              {copy.publicMoment.joinNext}
            </p>
            <div className="space-y-3">
              {upcomingMatches.map(m => (
                <Link
                  key={m.id}
                  href={`/match/${m.id}`}
                  className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-4 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <span className="font-display text-[15px] font-bold text-white group-hover:scale-105 transition-transform origin-left">
                    {m.home} <span className="text-white/40 font-normal mx-1">v</span> {m.away}
                  </span>
                  <span className="text-[11px] font-semibold text-cyan uppercase tracking-wider">{copy.checkin.action} →</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
