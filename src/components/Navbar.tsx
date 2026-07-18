// Implements FR-1.1, FR-3.2
'use client'
import { useState, useEffect, useRef } from 'react'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

      {/* Right side: avatar or sign-in with dropdown */}
      {userId ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 rounded-full bg-[var(--color-fore)] text-[var(--color-surface)] text-xs font-display tracking-wide flex items-center justify-center hover:opacity-90 transition-all cursor-pointer border border-[var(--color-border)] shadow-sm"
          >
            {displayName.slice(0, 2).toUpperCase()}
          </button>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-xl border border-[var(--color-border)] shadow-lg bg-[var(--color-surface)] py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-[var(--color-border-muted)]">
                <p className="text-[9px] text-[var(--color-fore-3)] font-bold uppercase tracking-wider">Account</p>
                <p className="text-xs font-bold text-[var(--color-fore)] truncate">{displayName}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  void handleSignOut()
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50/50 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          href={`/sign-in?next=${encodeURIComponent(pathname)}`}
          className="text-[13px] font-semibold text-[var(--color-fore)] hover:text-[var(--color-fore-2)] transition-colors"
        >
          Sign in
        </Link>
      )}

      {/* Mobile bottom tab bar — Floating dock style */}
      <div className="fixed bottom-4 inset-x-4 sm:hidden bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-2xl flex z-50 shadow-lg px-2 py-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-bold transition-all duration-200 ${
              pathname === l.href
                ? 'text-[var(--color-accent)] scale-105'
                : 'text-[var(--color-fore-3)] hover:text-[var(--color-fore-2)]'
            }`}
          >
            <span className={`w-1 h-1 rounded-full mb-1 transition-all ${pathname === l.href ? 'bg-[var(--color-accent)] scale-125' : 'bg-transparent'}`} />
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
