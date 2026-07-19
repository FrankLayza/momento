// Implements FR-1.1, FR-3.2
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const links = [
  {
    href: '/',
    label: 'Matches',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 transition-all duration-200 ${active ? 'stroke-[var(--color-accent)]' : 'stroke-current'}`} fill="none" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  },
  {
    href: '/vault',
    label: 'Vault',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 transition-all duration-200 ${active ? 'stroke-[var(--color-accent)]' : 'stroke-current'}`} fill="none" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 transition-all duration-200 ${active ? 'stroke-[var(--color-accent)]' : 'stroke-current'}`} fill="none" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
        <path d="M12 2a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
      </svg>
    )
  },
  {
    href: '/advanced',
    label: 'Advanced',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 transition-all duration-200 ${active ? 'stroke-[var(--color-accent)]' : 'stroke-current'}`} fill="none" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    )
  },
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
    <>
      <nav className="sticky top-0 z-50 bg-[var(--color-surface)]/85 backdrop-blur-md border-b border-[var(--color-border)]/60 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm transition-all duration-300">
        {/* Logo */}
        <div className="flex items-center">
          <span className="font-landing-display text-lg font-bold text-[var(--color-fore)]">Momento</span>
        </div>

        {/* Nav links — hidden on smallest screens, visible sm+ */}
        <div className="hidden sm:flex gap-6">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-landing-body text-[14px] font-medium transition-colors ${
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
      </nav>

      {/* Mobile bottom tab bar — Floating dock style (placed outside <nav> to fix Safari containing block) */}
      <div className="fixed bottom-4 inset-x-4 sm:hidden bg-[var(--color-surface)]/90 backdrop-blur-md border border-[var(--color-border)] rounded-2xl flex z-50 shadow-lg px-2 py-1.5">
        {links.map(l => {
          const isActive = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center justify-center py-1 font-landing-body text-[10px] font-medium transition-all duration-200 ${
                isActive
                  ? 'text-[var(--color-accent)] scale-105'
                  : 'text-[var(--color-fore-3)] hover:text-[var(--color-fore-2)]'
              }`}
            >
              <div className={`mb-1 transition-all duration-200 ${isActive ? 'scale-110' : 'opacity-70'}`}>
                {l.icon(isActive)}
              </div>
              {l.label}
            </Link>
          );
        })}
      </div>
    </>
  )
}
