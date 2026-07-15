/**
 * src/app/page.tsx
 * Fixtures homepage — Implements FR-1.1 (PRD) & visual direction from fotMob / Linear.
 * Fully public: no session check of any kind. Guests see the same fixtures
 * feed as signed-in users; only Check In / Claim / Vault / Advanced gate on auth.
 */

import type { Metadata } from "next"
import { listMatches, getUserCheckins, getUserById } from "@/server/db/queries"
import { listWorldCupMatches, getPrematchProbabilities } from "@/server/txline/adapter"
import { createClient } from "@/lib/supabase/server"
import { FixturesPageClient } from "@/components/FixturesPageClient"
import type { NormalisedMatch, NormalisedOddsTick } from "@/server/txline/types"

export const metadata: Metadata = {
  title: "Fixtures | Momento",
}

export const revalidate = 10 // ISR: refresh fixture data every 10 seconds for high-density live updates

// Implements FR-1.1 (browse-first, no auth wall)
export default async function Page() {
  const supabase = await createClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()

  // 1. Fetch user details and check-ins (guests get empty defaults, no gate)
  let userCheckins = new Set<string>()
  let displayName = "Fan"
  if (sessionUser) {
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

  // Only a match TxLINE reports as actually in play may occupy the LIVE slot —
  // liveTxMatches contains every World Cup fixture regardless of status.
  const liveMatch = liveTxMatches.find(m => m.status === "live") ?? null

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

  // 5. Build list of upcoming/scheduled matches.
  // Merge the DB (populated by the worker) with the live TxLINE feed so fixtures
  // appear even before the worker has synced them — the feed is the fresher
  // source and carries the real competition label. Feed wins on conflicts; the
  // current live match is excluded (it owns the LIVE slot above).
  const upcomingById = new Map<string, NormalisedMatch>()
  for (const m of dbMatches) {
    if (m.status !== "scheduled") continue
    upcomingById.set(m.id, {
      id: m.id,
      home: m.home,
      away: m.away,
      kickoffUtc: m.kickoffUtc,
      status: "scheduled",
      minute: null,
      score: { home: 0, away: 0 },
      competition: m.competition ?? undefined,
    })
  }
  for (const m of liveTxMatches) {
    if (m.status !== "scheduled") continue
    upcomingById.set(m.id, m)
  }
  if (liveMatch) upcomingById.delete(liveMatch.id)

  const upcomingMatches: NormalisedMatch[] = [...upcomingById.values()].sort(
    (a, b) => new Date(a.kickoffUtc).getTime() - new Date(b.kickoffUtc).getTime()
  )

  const isCheckedIn = liveMatch ? userCheckins.has(liveMatch.id) : false

  return (
    <FixturesPageClient
      initialLiveMatch={liveMatch}
      initialLiveOdds={liveOdds}
      upcomingMatches={upcomingMatches}
      initialCheckedIn={isCheckedIn}
      checkedInMatchIds={[...userCheckins]}
      displayName={displayName}
      userId={sessionUser?.id ?? null}
    />
  )
}
