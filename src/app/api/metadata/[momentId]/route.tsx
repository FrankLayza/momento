/**
 * src/app/api/metadata/[momentId]/route.tsx
 * Metaplex-standard token metadata JSON for a claimed Moment edition.
 * Implements FR-5.3 (PRD), §8 (Implementation Guide).
 *
 * mintEdition.ts sets each cNFT's metadata URI to ${APP_URL}/api/metadata/{momentId}
 * (see buildMetadataUri). This route is what that URI resolves to — without it the
 * minted collectible has no name/image and renders empty in wallets and on Solscan.
 *
 * The NFT image reuses the already-built share card at /api/og/{momentId} (FR-6.1),
 * so the on-chain artefact and the shareable card are the exact same visual.
 *
 * This route lives under src/app/api, which is exempt from the copy-scan (LR-1) —
 * it is server-side metadata, not fan-facing UI, so technical wording is allowed.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getMomentById, listMatches } from "@/server/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ momentId: string }> }
) {
  const { momentId } = await params;

  const moment = await getMomentById(momentId).catch(() => null);
  if (!moment) {
    return new Response("Not found", { status: 404 });
  }

  const matches = await listMatches().catch(() => []);
  const match   = matches.find(m => m.id === moment.matchId);
  const home    = match?.home ?? "Home";
  const away    = match?.away ?? "Away";

  const eventLabel =
    moment.trigger === "T1" ? "Goal"
    : moment.trigger === "T2" ? "Red card"
    : moment.trigger === "T3" ? "Probability shift"
    : "Full-time upset";

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const imageUrl = `${appUrl}/api/og/${momentId}`;
  const chancePct = Math.round((1 - moment.pBefore.home) * 100);

  // Metaplex-standard token metadata (name mirrors buildNftName in mintEdition.ts).
  return NextResponse.json({
    name:         `${home} v ${away} · ${moment.minute}' ${eventLabel}`,
    symbol:       "MMT",
    description:  `The market gave this a ${chancePct}% chance. ${moment.witnessCount} Witnesses.`,
    image:        imageUrl,
    external_url: `${appUrl}/m/${momentId}`,
    attributes: [
      { trait_type: "Shock rating",   value: moment.shockScore },
      { trait_type: "Tier",           value: moment.tier },
      { trait_type: "Event",          value: eventLabel },
      { trait_type: "Minute",         value: moment.minute },
      { trait_type: "Score",          value: `${moment.scoreHome}-${moment.scoreAway}` },
      { trait_type: "Witnesses",      value: moment.witnessCount },
      { trait_type: "Pre-match chance", value: `${chancePct}%` },
    ],
    properties: {
      category: "image",
      files: [{ uri: imageUrl, type: "image/png" }],
    },
  });
}
