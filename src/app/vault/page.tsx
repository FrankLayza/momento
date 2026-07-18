import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VaultGrid } from '@/components/VaultGrid'
import { Navbar } from '@/components/Navbar'
import { getUserById, listMatches, getUserMoments } from '@/server/db/queries'

export default async function VaultPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/vault&reason=vault')

  const matches = await listMatches().catch(() => [])
  
  // Use the service-role query to bypass any RLS restrictions that might hide moments
  const userMoments = await getUserMoments(user.id).catch(err => {
    console.error('[VaultPage] Error fetching user moments:', err)
    return []
  })

  const editions = userMoments.map(({ edition, moment }) => {
    const match = matches.find(m => m.id === moment.matchId)
    return {
      id: edition.id,
      moment,
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
    <div className="min-h-screen font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      <Navbar displayName={displayName} userId={user.id} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--color-fore-3)' }}>Your collection</p>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-none mb-1" style={{ color: 'var(--color-fore)' }}>VAULT</h1>
        <p className="text-sm mb-8 font-medium" style={{ color: 'var(--color-fore-2)' }}>Every Moment you witnessed, sealed forever.</p>
        <VaultGrid editions={editions} />
      </div>
    </div>
  )
}
