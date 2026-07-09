/**
 * src/app/api/og/[momentId]/route.tsx
 * Server-generated share card — 1080×1350 px.
 * Implements FR-6.1 (PRD).
 *
 * Content: teams and score, minute, event description,
 * shock tier and percentage line, Witness count, Momento wordmark.
 * No user personal data on the card.
 */

import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";
import { getMomentById, listMatches } from "@/server/db/queries";

export const runtime = "edge";

// Tier → accent colour (mirrors tailwind.config.ts tokens)
const TIER_COLORS: Record<string, string> = {
  Common:  "#9BA3AF",
  Notable: "#22D3EE",
  Shock:   "#F59E0B",
  Seismic: "#EF4444",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { momentId: string } }
) {
  const moment = await getMomentById(params.momentId).catch(() => null);

  if (!moment) {
    return new Response("Not found", { status: 404 });
  }

  const matches = await listMatches().catch(() => []);
  const match   = matches.find(m => m.id === moment.matchId);

  const accentColor = TIER_COLORS[moment.tier] ?? "#9BA3AF";
  const pct         = Math.round((1 - moment.pBefore.home) * 100);
  const homeTeam    = match?.home ?? "Home";
  const awayTeam    = match?.away ?? "Away";

  const eventLabel =
    moment.trigger === "T1" ? "Goal"
    : moment.trigger === "T2" ? "Red card"
    : moment.trigger === "T3" ? "Probability shift"
    : "Full-time upset";

  return new ImageResponse(
    (
      <div
        style={{
          display:         "flex",
          flexDirection:   "column",
          width:           "100%",
          height:          "100%",
          backgroundColor: "#0B0E14",
          padding:         "80px 64px",
          fontFamily:      "sans-serif",
          position:        "relative",
        }}
      >
        {/* Accent border top */}
        <div
          style={{
            position:        "absolute",
            top:             0,
            left:            0,
            right:           0,
            height:          "6px",
            backgroundColor: accentColor,
          }}
        />

        {/* Wordmark */}
        <div style={{ display: "flex", marginBottom: "auto" }}>
          <span style={{ color: "#F3F4F6", fontSize: "28px", fontWeight: 700, letterSpacing: "-0.5px" }}>
            Momento
          </span>
        </div>

        {/* Teams */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "40px" }}>
          <div style={{ color: "#9CA3AF", fontSize: "22px", fontWeight: 500 }}>
            {homeTeam} v {awayTeam}
          </div>
          <div style={{ color: "#F3F4F6", fontSize: "64px", fontWeight: 800, lineHeight: 1, letterSpacing: "-2px" }}>
            {moment.scoreHome}–{moment.scoreAway}
          </div>
          <div style={{ color: "#9CA3AF", fontSize: "22px" }}>
            {moment.minute}&apos; · {eventLabel}
          </div>
        </div>

        {/* Shock rating */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "40px" }}>
          <div style={{ color: accentColor, fontSize: "18px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "2px" }}>
            {moment.tier}
          </div>
          <div style={{ color: "#F3F4F6", fontSize: "96px", fontWeight: 800, lineHeight: 1, letterSpacing: "-4px" }}>
            {moment.shockScore}
          </div>
          <div style={{ color: "#9CA3AF", fontSize: "18px" }}>
            Shock rating out of 100
          </div>
        </div>

        {/* Probability + witness line */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ color: "#F3F4F6", fontSize: "24px", fontWeight: 600 }}>
            The market gave this a {pct}% chance.
          </div>
          <div style={{ color: "#9CA3AF", fontSize: "20px" }}>
            {moment.witnessCount.toLocaleString()} Witnesses
          </div>
        </div>
      </div>
    ),
    {
      width:  1080,
      height: 1350,
    }
  );
}
