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
    <div className="bg-cream min-h-screen font-body">
      <Navbar displayName={displayName} userId={user?.id ?? null} />
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <p className="text-[11px] font-medium tracking-[0.12em] text-ink-ghost uppercase mb-2">FIFA World Cup 2026</p>
        <h1 className="font-display text-3xl sm:text-[40px] font-bold text-ink leading-[1.05] mb-2">Leaderboard</h1>
        <p className="text-sm text-ink-secondary mb-8">The top Witnesses across all matches.</p>
        <LeaderboardClient
          byMoments={byMoments}
          byTier={byTier}
          currentUserId={user?.id ?? null}
        />
      </div>
    </div>
  )
}
