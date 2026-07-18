"use client";
import { useState } from "react";

type Tab = "moments" | "tier";

const TIER_BADGE: Record<string, { bg: string; color: string }> = {
  Seismic: { bg: "#FEE2E2", color: "#DC2626" },
  Shock:   { bg: "#FEF3C7", color: "#D97706" },
  Notable: { bg: "#CFFAFE", color: "#0891B2" },
  Common:  { bg: "var(--color-surface-2)", color: "var(--color-fore-3)" },
};

interface Entry {
  user_id: string;
  display_name: string;
  moment_count: number;
  top_tier: string;
}

interface Props {
  byMoments: Entry[];
  byTier: Entry[];
  currentUserId: string | null;
}

export function LeaderboardClient({ byMoments, byTier, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("moments");
  const entries = tab === "moments" ? byMoments : byTier;
  const currentUserEntry = entries.find((e) => e.user_id === currentUserId);
  const currentUserRank = entries.findIndex((e) => e.user_id === currentUserId) + 1;

  return (
    <div>
      {/* Pill toggle */}
      <div
        className="flex rounded-full p-1 w-full sm:w-fit mb-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {(["moments", "tier"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 sm:flex-none px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150"
            style={
              tab === t
                ? { background: 'var(--color-fore)', color: 'var(--color-surface)' }
                : { color: 'var(--color-fore-3)' }
            }
          >
            {t === "moments" ? "Most Moments" : "Highest Tier"}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div
          className="text-center py-16 px-6 rounded-2xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--color-surface-2)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-fore-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
              <path d="M12 2a6 6 0 0 1 6 6v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" />
            </svg>
          </div>
          <h3 className="font-display text-xl mb-2" style={{ color: 'var(--color-fore)' }}>
            NO WITNESSES YET
          </h3>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-fore-3)' }}>
            Check back once matches begin and fans start claiming Moments.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="px-3 sm:px-5 py-1">
            {entries.slice(0, 20).map((entry, i) => {
              const isYou = entry.user_id === currentUserId;
              const initials = entry.display_name.slice(0, 2).toUpperCase();
              const badge = TIER_BADGE[entry.top_tier] ?? TIER_BADGE.Common;
              return (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-2 sm:gap-3 py-3"
                  style={{
                    borderBottom: i < 19 ? '1px solid var(--color-border-muted)' : 'none',
                    background: isYou ? 'var(--color-accent-dim)' : undefined,
                    margin: isYou ? '0 -12px' : undefined,
                    padding: isYou ? '12px 12px' : undefined,
                    borderRadius: isYou ? '8px' : undefined,
                  }}
                >
                  <span
                    className="font-display text-[15px] w-6 shrink-0 text-center"
                    style={{ color: i < 3 ? 'var(--color-fore)' : 'var(--color-fore-3)' }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-display text-[11px] shrink-0"
                    style={
                      isYou
                        ? { background: 'var(--color-accent)', color: '#fff' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-fore-2)' }
                    }
                  >
                    {initials}
                  </div>
                  <span className="flex-1 text-[13px] sm:text-[14px] font-semibold truncate min-w-0 pr-2" style={{ color: 'var(--color-fore)' }}>
                    {entry.display_name}
                    {isYou && (
                      <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--color-accent)' }}>
                        (you)
                      </span>
                    )}
                  </span>
                  {tab === "moments" ? (
                    <span className="font-display text-[16px] shrink-0" style={{ color: 'var(--color-fore)' }}>
                      {entry.moment_count}
                    </span>
                  ) : (
                    <span
                      className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {entry.top_tier}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pinned current user if outside top 20 */}
          {currentUserEntry && currentUserRank > 20 && (
            <div
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3"
              style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-accent-dim)' }}
            >
              <span className="font-display text-[15px] w-6 shrink-0 text-center" style={{ color: 'var(--color-fore-3)' }}>
                {currentUserRank}
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-display text-[11px] shrink-0" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                {currentUserEntry.display_name.slice(0, 2).toUpperCase()}
              </div>
              <span className="flex-1 text-[13px] sm:text-[14px] font-semibold truncate min-w-0 pr-2" style={{ color: 'var(--color-fore)' }}>
                {currentUserEntry.display_name}{" "}
                <span className="text-[10px] font-normal" style={{ color: 'var(--color-accent)' }}>(you)</span>
              </span>
              {tab === "moments" ? (
                <span className="font-display text-[16px] shrink-0" style={{ color: 'var(--color-fore)' }}>
                  {currentUserEntry.moment_count}
                </span>
              ) : (
                <span
                  className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: (TIER_BADGE[currentUserEntry.top_tier] ?? TIER_BADGE.Common).bg,
                    color: (TIER_BADGE[currentUserEntry.top_tier] ?? TIER_BADGE.Common).color,
                  }}
                >
                  {currentUserEntry.top_tier}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
