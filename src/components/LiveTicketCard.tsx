// Implements FR-1.1, FR-1.2
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { flagUrl } from "@/lib/teamFlags";
import { copy } from "@/lib/copy";
import { CheckinButton } from "@/components/CheckinButton";
import type {
  NormalisedMatch,
  NormalisedOddsTick,
} from "@/server/txline/types";
import { formatMatchMinute } from "@/lib/matchUtils";

interface LiveTicketCardProps {
  match: NormalisedMatch;
  odds: NormalisedOddsTick;
  initialCheckedIn: boolean;
  competition?: string;
}

const BARCODE_PATTERN = [
  1.5, 2, 2.5, 3, 1.5, 2.5, 2, 3, 1.5, 3, 2, 2.5, 1.5, 3,
];

export function LiveTicketCard({
  match,
  odds,
  initialCheckedIn,
  competition = "FIFA World Cup 2026",
}: LiveTicketCardProps) {
  const pHomePct = Math.round(odds.pHome * 100);
  const pAwayPct = Math.round(odds.pAway * 100);
  const pDrawPct = 100 - pHomePct - pAwayPct;
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
      onClick={() => router.push(`/match/${match.id}`)}
      className="rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow flex flex-col sm:flex-row"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* ── LEFT PANEL: coloured ticket body ─────────────────────────── */}
      <div
        className="flex-1 relative overflow-hidden flex flex-col justify-between p-5 sm:p-7"
        style={{ background: "#0F3D2E", minHeight: 220 }}
      >
        {/* Large watermark team names behind content */}
        <div
          className="absolute inset-0 flex items-center justify-between px-4 select-none pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <span
            className="font-display text-[clamp(48px,12vw,96px)] leading-none uppercase tracking-tight opacity-10 text-white"
            style={{ letterSpacing: "0.02em" }}
          >
            {match.home}
          </span>
          <span
            className="font-display text-[clamp(48px,12vw,96px)] leading-none uppercase tracking-tight opacity-10 text-white text-right"
            style={{ letterSpacing: "0.02em" }}
          >
            {match.away}
          </span>
        </div>

        {/* Top row: competition + live badge */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
            {competition}
          </span>
          <span className="flex items-center gap-1.5 bg-accent text-fore text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Live
          </span>
        </div>

        {/* Teams */}
        <div className="relative z-10 flex items-center justify-between mt-4">
          {/* Home */}
          <div className="flex items-center gap-2.5">
            <img
              src={flagUrl(match.home, 80)}
              alt={match.home}
              className="w-8 h-6 sm:w-10 sm:h-7 rounded object-cover shadow-md"
            />
            <div>
              <p className="font-display text-lg sm:text-2xl leading-none text-white uppercase tracking-wide">
                {match.home}
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="font-display text-[48px] sm:text-[64px] leading-none text-[#4DD98A]">
              {match.score.home}
            </span>
            <span className="font-display text-[32px] sm:text-[48px] leading-none text-white/30">
              –
            </span>
            <span className="font-display text-[48px] sm:text-[64px] leading-none text-[#FF6B5B]">
              {match.score.away}
            </span>
          </div>

          {/* Away */}
          <div className="flex items-center gap-2.5 flex-row-reverse sm:flex-row">
            <img
              src={flagUrl(match.away, 80)}
              alt={match.away}
              className="w-8 h-6 sm:w-10 sm:h-7 rounded object-cover shadow-md"
            />
            <div className="text-right sm:text-left">
              <p className="font-display text-lg sm:text-2xl leading-none text-white uppercase tracking-wide">
                {match.away}
              </p>
            </div>
          </div>
        </div>

        {/* Minute */}
        <p className="relative z-10 text-xs text-white/50 font-semibold mt-2">
          {match.minute != null && (
            <>{formatMatchMinute(match.minute, match.phase)}' · </>
          )}
          {copy.fixtures.liveNow}
        </p>

        {/* Probability bar */}
        <div className="relative z-10 mt-4">
          <div className="flex justify-between text-[10px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
            <span>
              {match.home} {pHomePct}%
            </span>
            <span>Draw {pDrawPct}%</span>
            <span>
              {match.away} {pAwayPct}%
            </span>
          </div>
          <div
            className="h-[4px] rounded-full overflow-hidden flex"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${pHomePct}%`, background: "#4DD98A" }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${pDrawPct}%`,
                background: "rgba(255,255,255,0.2)",
              }}
            />
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${pAwayPct}%`, background: "#FF6B5B" }}
            />
          </div>
        </div>
      </div>

      {/* ── RIGHT STUB: white tear-off ────────────────────────────────── */}
      <div
        className="w-full sm:w-[145px] shrink-0 flex sm:flex-col flex-row items-center sm:justify-between justify-between p-4 sm:p-5 gap-4 sm:gap-0 relative"
        style={{ background: "var(--color-surface)" }}
      >
        {/* Perforated left edge (desktop only) */}
        <div className="hidden sm:block absolute top-3 bottom-3 left-0">
          <div
            className="h-full w-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to bottom, var(--color-border) 0, var(--color-border) 6px, transparent 6px, transparent 12px)",
            }}
          />
        </div>
        {/* Perforated top edge (mobile only) */}
        <div className="sm:hidden absolute top-0 left-3 right-3">
          <div
            className="w-full h-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--color-border) 0, var(--color-border) 6px, transparent 6px, transparent 12px)",
            }}
          />
        </div>

        {/* Match minute info */}
        <div className="sm:pl-3">
          <p className="text-[9px] font-bold tracking-[0.14em] text-fore-3 uppercase mb-0.5">
            {copy.checkin.matchNo}
          </p>
          <p className="font-display text-2xl sm:text-3xl text-fore leading-none">
            {match.minute != null
              ? formatMatchMinute(match.minute, match.phase)
              : "–"}
            {match.minute != null && (
              <span className=" text-fore-3 font-sans font-normal">
                '
              </span>
            )}
          </p>
          <p className="text-[9px] text-fore-3 mt-0.5">
            {copy.checkin.minuteCaption}
          </p>
        </div>

        {/* Barcode + CTA */}
        <div className="sm:pl-3">
          <p className="text-[9px] font-bold tracking-widest text-fore-3 uppercase mb-2">
            {copy.fixtures.live}
          </p>
          {/* Decorative barcode */}
          <div className="flex gap-[1.5px] items-end mb-3">
            {BARCODE_PATTERN.map((w, idx) => (
              <span
                key={idx}
                className="h-5 rounded-[1px]"
                style={{
                  width: `${w}px`,
                  background: "var(--color-fore)",
                  opacity: 0.25,
                }}
              />
            ))}
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[calc(100%+20px)] -ml-2.5 sm:w-[calc(100%+36px)] sm:-ml-6 mt-2"
          >
            <CheckinButton
              matchId={match.id}
              initialCheckedIn={initialCheckedIn}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
