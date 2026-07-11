/**
 * src/app/page.tsx
 * Fixtures homepage — Implements FR-1.1 (PRD) & visual direction from fotMob / Linear.
 * Branches on auth state: guests see landing page, logged in users see fixtures.
 */

import type { Metadata } from "next"
import { cookies } from "next/headers"
import { listMatches, getUserCheckins, getUserById } from "@/server/db/queries"
import { listWorldCupMatches, getPrematchProbabilities } from "@/server/txline/adapter"
import { createClient } from "@/utils/supabase/server"
import { Landing } from "@/components/landing/Landing"
import { FixturesPageClient } from "@/components/FixturesPageClient"
import type { NormalisedMatch, NormalisedOddsTick } from "@/server/txline/types"

export const metadata: Metadata = {
  title: "Fixtures | Momento",
}

export const revalidate = 10 // ISR: refresh fixture data every 10 seconds for high-density live updates

// Implements FR-1.1 (browse-first, no auth wall via branching)
export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user: sessionUser } } = await supabase.auth.getUser()

  if (!sessionUser) {
    return <Landing />
  }

  // 1. Fetch user details and check-ins
  let userCheckins = new Set<string>()
  let displayName = "Fan"
  try {
    const [checkins, appUser] = await Promise.all([
      getUserCheckins(sessionUser.id),
      getUserById(sessionUser.id),
    ])
    userCheckins = new Set(checkins.map(c => c.matchId))
    displayName = appUser?.displayName || sessionUser.email?.split("@")[0] || "Fan"
  } catch (err) {
    console.error("[FixturesPage] Failed to load user metadata:", err)
  }

  // 2. Fetch matches from DB
  let dbMatches: any[] = []
  try {
    dbMatches = await listMatches()
  } catch (err) {
    console.error("[FixturesPage] Failed to load matches from DB:", err)
  }

  // 3. Fetch live feed from TxLINE to find live matches
  let liveTxMatches: NormalisedMatch[] = []
  try {
    liveTxMatches = await listWorldCupMatches()
  } catch (err) {
    console.error("[FixturesPage] Failed to load live matches from TxLINE:", err)
  }

  const liveMatch = liveTxMatches[0] || null

  // 4. Fetch odds snapshot for live match
  let liveOdds: NormalisedOddsTick | null = null
  if (liveMatch) {
    try {
      const probs = await getPrematchProbabilities(liveMatch.id)
      liveOdds = {
        matchId: liveMatch.id,
        atUtc: new Date().toISOString(),
        pHome: probs?.pHome ?? 0.33,
        pDraw: probs?.pDraw ?? 0.34,
        pAway: probs?.pAway ?? 0.33,
      }
    } catch (err) {
      console.error("[FixturesPage] Failed to load pre-match odds:", err)
      liveOdds = {
        matchId: liveMatch.id,
        atUtc: new Date().toISOString(),
        pHome: 0.33,
        pDraw: 0.34,
        pAway: 0.33,
      }
    }
  }

  // 5. Build list of upcoming/scheduled matches
  const upcomingMatches: NormalisedMatch[] = dbMatches
    .filter(m => m.status === "scheduled")
    .map(m => ({
      id: m.id,
      home: m.home,
      away: m.away,
      kickoffUtc: m.kickoffUtc,
      status: "scheduled",
      minute: null,
      score: { home: 0, away: 0 },
    }))

  const isCheckedIn = liveMatch ? userCheckins.has(liveMatch.id) : false

  return (
    <FixturesPageClient
      initialLiveMatch={liveMatch}
      initialLiveOdds={liveOdds}
      upcomingMatches={upcomingMatches}
      initialCheckedIn={isCheckedIn}
      displayName={displayName}
      userId={sessionUser.id}
    />
  )
}
