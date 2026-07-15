import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchPageClient } from '@/components/MatchPageClient'
import { listMatches, getUserById } from '@/server/db/queries'
import { getLiveMatchState, getFinishedMatchScore } from '@/server/txline/adapter'

async function getMatch(id: string) {
  const matches = await listMatches().catch(() => [])
  const match = matches.find((m) => m.id === id) || null
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
  const { data: { session } } = await supabase.auth.getSession()

  // fetch match data from TxLINE adapter
  // TODO: wire to real adapter once TxLINE docs confirmed
  const match = await getMatch(id)
  if (!match) redirect('/')

  const checkin = session
    ? await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('match_id', id)
        .maybeSingle()
    : null

  let displayName = 'Fan'
  if (session?.user) {
    try {
      const appUser = await getUserById(session.user.id).catch(() => null)
      displayName = appUser?.displayName || session.user.email?.split('@')[0] || 'Fan'
    } catch (err) {
      console.error('[MatchPage] Failed to fetch user profile:', err)
    }
  }

  return (
    <MatchPageClient
      match={match}
      initialCheckedIn={!!checkin?.data}
      userId={session?.user.id ?? null}
      displayName={displayName}
    />
  )
}
