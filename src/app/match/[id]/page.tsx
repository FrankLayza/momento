import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchPageClient } from '@/components/MatchPageClient'
import { listMatches, getUserById } from '@/server/db/queries'
import { getLiveMatchState, getFinishedMatchScore, listWorldCupMatches, getPrematchProbabilities } from '@/server/txline/resolve'
import type { NormalisedMatch, NormalisedOddsTick } from '@/server/txline/types'

async function getMatch(id: string) {
  // The DB is only populated by the worker's fixture sync, which advances
  // matches.status (scheduled → live → finished) at most every 60s. The live
  // TxLINE feed is the fresher source, so fetch both and let the feed's status
  // win — otherwise the detail page would trust a stale DB 'scheduled' row and
  // render "Upcoming / Kick off soon" for a match the Fixtures list already
  // shows as LIVE (the two pages must not disagree).
  const [matches, feed] = await Promise.all([
    listMatches().catch(() => [] as NormalisedMatch[]),
    listWorldCupMatches().catch(() => [] as NormalisedMatch[]),
  ])

  const dbMatch = matches.find((m) => m.id === id) || null
  const feedMatch = feed.find((m) => m.id === id) || null
  let match: NormalisedMatch | null = dbMatch ?? feedMatch
  if (!match) return null

  // Reconcile status from the live feed (fresher than the DB).
  if (feedMatch) match = { ...match, status: feedMatch.status }

  // listMatches() reads from the DB, which never stores live score/minute
  // (see queries.ts) — merge in the real-time state from TxLINE so live and
  // recently-finished matches don't render as a frozen 0-0/Full time.
  if (match.status === 'live') {
    try {
      const live = await getLiveMatchState(id)
      if (live) {
        return {
          ...match,
          score: live.score,
          minute: live.minute,
          status: live.status as typeof match.status,
          phase: live.phase,
        }
      }
    } catch (err) {
      console.error('[MatchPage] Failed to fetch live match state:', err)
    }
  } else if (match.status === 'finished') {
    try {
      const score = await getFinishedMatchScore(id)
      return { ...match, score }
    } catch (err) {
      console.error('[MatchPage] Failed to fetch finished match score:', err)
    }
  }

  return match
}

async function getMatchOdds(id: string): Promise<NormalisedOddsTick | null> {
  try {
    const probs = await getPrematchProbabilities(id)
    if (!probs) return null
    return {
      matchId: id,
      atUtc: new Date().toISOString(),
      pHome: probs.pHome,
      pDraw: probs.pDraw,
      pAway: probs.pAway,
    }
  } catch (err) {
    console.error('[MatchPage] Failed to fetch odds:', err)
    return null
  }
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const match = await getMatch(id)
  if (!match) redirect('/')

  const odds = await getMatchOdds(id)

  const checkin = user
    ? await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('match_id', id)
        .maybeSingle()
    : null

  let displayName = 'Fan'
  if (user) {
    try {
      const appUser = await getUserById(user.id).catch(() => null)
      displayName = appUser?.displayName || user.email?.split('@')[0] || 'Fan'
    } catch (err) {
      console.error('[MatchPage] Failed to fetch user profile:', err)
    }
  }

  const isReplay = process.env.REPLAY_MODE === 'true'

  return (
    <MatchPageClient
      match={match}
      odds={odds ?? undefined}
      initialCheckedIn={!!checkin?.data}
      userId={user?.id ?? null}
      displayName={displayName}
      isReplay={isReplay}
    />
  )
}
