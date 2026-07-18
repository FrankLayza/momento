import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/LeaderboardClient'
import { Navbar } from '@/components/Navbar'
import { getUserById } from '@/server/db/queries'

interface LeaderboardEntry {
  user_id: string
  display_name: string
  moment_count: number
  top_tier: string
}

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawByMoments } = await supabase
    .from('leaderboard_view')
    .select('user_id, display_name, moment_count, top_tier')
    .order('moment_count', { ascending: false })
    .limit(50)

  const { data: rawByTier } = await supabase
    .from('leaderboard_view')
    .select('user_id, display_name, moment_count, top_tier')
    .order('top_tier_rank', { ascending: true })
    .limit(50)

  const byMoments = (rawByMoments as unknown as LeaderboardEntry[] | null) ?? []
  const byTier = (rawByTier as unknown as LeaderboardEntry[] | null) ?? []

  let displayName = 'Fan'
  if (user) {
    try {
      const appUser = await getUserById(user.id).catch(() => null)
      displayName = appUser?.displayName || user.email?.split('@')[0] || 'Fan'
    } catch (err) {
      console.error('[LeaderboardPage] Failed to fetch user profile:', err)
    }
  }

  return (
    <div className="min-h-screen font-body pb-16 sm:pb-0" style={{ background: 'var(--color-base)' }}>
      <Navbar displayName={displayName} userId={user?.id ?? null} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--color-fore-3)' }}>FIFA World Cup 2026</p>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-none mb-1" style={{ color: 'var(--color-fore)' }}>LEADERBOARD</h1>
        <p className="text-sm mb-8 font-medium" style={{ color: 'var(--color-fore-2)' }}>The top Witnesses across all matches.</p>
        <LeaderboardClient
          byMoments={byMoments}
          byTier={byTier}
          currentUserId={user?.id ?? null}
        />
      </div>
    </div>
  )
}
