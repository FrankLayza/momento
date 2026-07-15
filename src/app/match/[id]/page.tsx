import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchPageClient } from '@/components/MatchPageClient'
import { listMatches, getUserById } from '@/server/db/queries'
import { getLiveMatchState, getFinishedMatchScore, listWorldCupMatches } from '@/server/txline/adapter'
import type { NormalisedMatch } from '@/server/txline/types'

async function getMatch(id: string) {
  const matches = await listMatches().catch(() => [])
  let match: NormalisedMatch | null = matches.find((m) => m.id === id) || null

  // The DB is only populated by the worker's fixture sync. Fixtures that exist
  // in the live TxLINE feed but haven't been synced yet (any friendly, or the
  // World Cup fixtures before the worker's first run) would otherwise redirect
  // home. Fall back to the feed so every fixture the home page links to opens.
  if (!match) {
    const feed = await listWorldCupMatches().catch(() => [])
    match = feed.find((m) => m.id === id) || null
  }
  if (!match) return null

  // listMatches() reads from the DB, which never stores live score/minute
  // (see queries.ts) — merge in the real-time state from TxLINE so live and
  // recently-finished matches don't render as a frozen 0-0/Full time.
  if (match.status === 'live') {
    try {
      const live = await getLiveMatchState(id)
      if (live) {
        return { ...match, score: live.score, minute: live.minute, status: live.status as typeof match.status }
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

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const match = await getMatch(id)
  if (!match) redirect('/')

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

  return (
    <MatchPageClient
      match={match}
      initialCheckedIn={!!checkin?.data}
      userId={user?.id ?? null}
      displayName={displayName}
    />
  )
}
