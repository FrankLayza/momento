import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MatchPageClient } from '@/components/MatchPageClient'
import { listMatches } from '@/server/db/queries'

async function getMatch(id: string) {
  const matches = await listMatches().catch(() => [])
  return matches.find((m) => m.id === id) || null
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

  return (
    <MatchPageClient
      match={match}
      initialCheckedIn={!!checkin?.data}
      userId={session?.user.id ?? null}
    />
  )
}
