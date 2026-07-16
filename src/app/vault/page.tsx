import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VaultGrid } from '@/components/VaultGrid'
import { Navbar } from '@/components/Navbar'
import { getUserById, listMatches } from '@/server/db/queries'
import type { Moment } from '@/lib/types'

interface DbEdition {
  id: string
  moment_id: string
  user_id: string
  claimed_at: string
  moments: {
    id: string
    tier: Moment["tier"]
    score_home: number
    score_away: number
    minute: number
    match_id: string
    trigger: Moment["trigger"]
    p_before: Moment["pBefore"]
    shock_score: number
    witness_count: number
  } | null
}

export default async function VaultPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/vault&reason=vault')

  const { data } = await supabase
    .from('editions')
    .select(`*, moments(*)`)
    .eq('user_id', user.id)
    .order('claimed_at', { ascending: false })

  const rawEditions = (data as unknown as DbEdition[] | null) ?? []

  const matches = await listMatches().catch(() => [])

  // Ensure moments is not null before passing to VaultGrid to satisfy strict typing
  const editions = rawEditions
    .filter((e): e is DbEdition & { moments: NonNullable<DbEdition['moments']> } => e.moments !== null)
    .map((e) => {
      const match = matches.find(m => m.id === e.moments.match_id)
      return {
        id: e.id,
        moment: {
          id: e.moments.id,
          tier: e.moments.tier,
          scoreHome: e.moments.score_home,
          scoreAway: e.moments.score_away,
          minute: e.moments.minute,
          matchId: e.moments.match_id,
          trigger: e.moments.trigger,
          pBefore: e.moments.p_before,
          shockScore: e.moments.shock_score,
          witnessCount: e.moments.witness_count,
        } as Moment,
        matchDetails: match ? { home: match.home, away: match.away } : undefined
      }
    })

  let displayName = 'Fan'
  try {
    const appUser = await getUserById(user.id).catch(() => null)
    displayName = appUser?.displayName || user.email?.split('@')[0] || 'Fan'
  } catch (err) {
    console.error('[VaultPage] Failed to fetch user profile:', err)
  }

  return (
    <div className="bg-cream min-h-screen font-body">
      <Navbar displayName={displayName} userId={user.id} />
      <div className="max-w-3xl mx-auto px-8 py-10">
        <p className="text-[11px] font-medium tracking-[0.12em] text-ink-ghost uppercase mb-2">Your collection</p>
        <h1 className="font-display text-[40px] font-bold text-ink leading-[1.05] mb-2">Vault</h1>
        <p className="text-sm text-ink-secondary mb-8">Every Moment you witnessed, sealed forever.</p>
        <VaultGrid editions={editions} />
      </div>
    </div>
  )
}
