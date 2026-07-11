// Implements FR-1.1, FR-3.2
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const links = [
  { href: '/', label: 'Matches' },
  { href: '/vault', label: 'Vault' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/advanced', label: 'Advanced' },
]

export function Navbar({ displayName }: { displayName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-cream border-b border-cream-border px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-ink" />
        <span className="font-display font-bold text-lg text-ink">Momento</span>
      </div>
      <div className="flex gap-7">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[13px] font-medium tracking-wide transition-colors ${
              pathname === l.href ? 'text-ink' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button
        onClick={() => { void handleSignOut() }}
        title="Click to Sign out"
        className="w-8 h-8 rounded-full bg-ink text-cream text-xs font-display font-semibold flex items-center justify-center hover:opacity-85 transition-all cursor-pointer"
      >
        {displayName.slice(0, 2).toUpperCase()}
      </button>
    </nav>
  )
}
