// Implements FR-1.1 — fallback for the live-ticket slot when no match is live
"use client";

import { useRouter } from "next/navigation";
import { flagUrl } from "@/lib/teamFlags";
import { copy } from "@/lib/copy";
import { CheckinButton } from "@/components/CheckinButton";
import type { NormalisedMatch } from "@/server/txline/types";

interface Props {
  match: NormalisedMatch;
  initialCheckedIn?: boolean;
}

export function UpcomingFallbackCard({
  match,
  initialCheckedIn = false,
}: Props) {
  const router = useRouter();
  const kickoff = new Date(match.kickoffUtc);
  const time = kickoff.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = kickoff.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      onClick={() => router.push(`/match/${match.id}`)}
      className="rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow flex flex-col sm:flex-row"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* Left panel — deep navy for upcoming */}
      <div
        className="flex-1 relative overflow-hidden flex flex-col justify-between p-5 sm:p-7"
        style={{ background: "#1A1F6E", minHeight: 200 }}
      >
        {/* Watermark team names */}
        <div
          className="absolute inset-0 flex items-center justify-between px-4 select-none pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="font-display text-[clamp(40px,10vw,80px)] leading-none uppercase opacity-10 text-white">
            {match.home}
          </span>
          <span className="font-display text-[clamp(40px,10vw,80px)] leading-none uppercase opacity-10 text-white text-right">
            {match.away}
          </span>
        </div>

        {/* Competition eyebrow */}
        <span className="relative z-10 text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          {match.competition ?? copy.fixtures.fifaWorldCup2026}
        </span>

        {/* Teams */}
        <div className="relative z-10 flex items-center justify-between mt-4">
          <div className="flex items-center gap-2.5">
            <img
              src={flagUrl(match.home, 80)}
              alt={match.home}
              className="w-8 h-6 sm:w-10 sm:h-7 rounded object-cover shadow-md"
            />
            <p className="font-display text-lg sm:text-2xl text-white uppercase tracking-wide">
              {match.home}
            </p>
          </div>

          {/* Pre-match dashes */}
          <div className="font-display text-[40px] sm:text-[52px] leading-none text-white/20">
            – –
          </div>

          <div className="flex items-center gap-2.5 flex-row-reverse sm:flex-row">
            <img
              src={flagUrl(match.away, 80)}
              alt={match.away}
              className="w-8 h-6 sm:w-10 sm:h-7 rounded object-cover shadow-md"
            />
            <p className="font-display text-lg sm:text-2xl text-white uppercase tracking-wide text-right sm:text-left">
              {match.away}
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40 font-semibold mt-2">
          {copy.fixtures.kicksOffAt(time)} · {date}
        </p>
      </div>

      {/* Right stub */}
      <div
        className="w-full sm:w-[135px] shrink-0 flex sm:flex-col flex-row items-center sm:justify-between justify-between p-4 sm:p-5 gap-4 sm:gap-0 relative"
        style={{ background: 'var(--color-surface)' }}
      >
        {/* Perforations */}
        <div className="hidden sm:block absolute top-3 bottom-3 left-0">
          <div className="h-full w-px" style={{
            backgroundImage: 'repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 6px, transparent 6px, transparent 12px)'
          }} />
        </div>
        <div className="sm:hidden absolute top-0 left-3 right-3">
          <div className="w-full h-px" style={{
            backgroundImage: 'repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 6px, transparent 6px, transparent 12px)'
          }} />
        </div>

        {/* Kickoff time */}
        <div className="sm:pl-3">
          <p className="text-[9px] font-bold tracking-[0.14em] text-[var(--color-fore-3)] uppercase mb-0.5">
            {copy.fixtures.kickoff}
          </p>
          <p className="font-display text-2xl text-[var(--color-fore)] leading-none">
            {time}
          </p>
          <p className="text-[9px] text-[var(--color-fore-3)] mt-0.5">{date}</p>
        </div>

        {/* CTA */}
        <div className="sm:pl-3">
          <p className="text-[9px] font-bold tracking-[0.1em] text-[var(--color-fore-3)] uppercase mb-2">
            {copy.fixtures.notYetLive}
          </p>
          <div onClick={(e) => e.stopPropagation()} className="w-[calc(100%+20px)] -ml-2.5 sm:w-[calc(100%+36px)] sm:-ml-4 mt-2">
            <CheckinButton
              matchId={match.id}
              initialCheckedIn={initialCheckedIn}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
