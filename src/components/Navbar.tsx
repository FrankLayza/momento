// Implements FR-1.1, FR-3.2
'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/', label: 'Matches' },
  { href: '/vault', label: 'Vault' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/advanced', label: 'Advanced' },
]

export function Navbar({
  displayName,
  userId = null,
}: {
  displayName: string
  userId?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-[var(--color-surface)]/85 backdrop-blur-md border-b border-[var(--color-border)]/60 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)]" />
        <span className="font-display text-xl tracking-wide text-[var(--color-fore)]">MOMENTO</span>
      </div>

      {/* Nav links — hidden on smallest screens, visible sm+ */}
      <div className="hidden sm:flex gap-6">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-[13px] font-semibold transition-colors ${
              pathname === l.href
                ? 'text-[var(--color-fore)]'
                : 'text-[var(--color-fore-3)] hover:text-[var(--color-fore-2)]'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* Right side: avatar or sign-in */}
      {userId ? (
        <button
          onClick={() => { void handleSignOut() }}
          title="Click to Sign out"
          className="w-8 h-8 rounded-full bg-[var(--color-fore)] text-[var(--color-surface)] text-xs font-display tracking-wide flex items-center justify-center hover:opacity-85 transition-all cursor-pointer"
        >
          {displayName.slice(0, 2).toUpperCase()}
        </button>
      ) : (
        <Link
          href={`/sign-in?next=${encodeURIComponent(pathname)}`}
          className="text-[13px] font-semibold text-[var(--color-fore)] hover:text-[var(--color-fore-2)] transition-colors"
        >
          Sign in
        </Link>
      )}

      {/* Mobile bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 sm:hidden bg-[var(--color-surface)] border-t border-[var(--color-border)] flex z-50">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 text-[10px] font-semibold transition-colors ${
              pathname === l.href
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-fore-3)]'
            }`}
          >
            <span className={`w-1 h-1 rounded-full mb-1 transition-all ${pathname === l.href ? 'bg-[var(--color-accent)]' : 'bg-transparent'}`} />
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
