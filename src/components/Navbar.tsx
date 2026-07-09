/**
 * src/components/Navbar.tsx
 * Global header navigation bar.
 * Implements FR-2.3 (Auth state display) & visual direction from Linear.app (§12).
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { copy } from "@/lib/copy";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial user
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);
    };
    void fetchUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleSignInClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("signin", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const navLinks = [
    { href: "/", label: "Matches" },
    { href: "/vault", label: "Vault" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/advanced", label: "Advanced" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 h-14">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="h-4 w-4 rounded bg-tier-notable transition-transform group-hover:rotate-12 duration-200" />
          <span className="font-display text-base font-bold tracking-tight text-ink-primary">
            {copy.appName}
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden sm:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-medium transition-colors ${
                  isActive
                    ? "text-tier-notable font-semibold"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth Actions */}
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-20 rounded-lg bg-surface-raised animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs text-ink-secondary truncate max-w-[120px]">
                {user.email}
              </span>
              <button
                onClick={() => { void handleSignOut(); }}
                className="rounded-lg border border-surface-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:bg-surface-overlay hover:text-ink-primary transition-colors"
              >
                {copy.auth.signOut}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignInClick}
              className="rounded-lg bg-ink-primary px-3.5 py-1.5 text-xs font-semibold text-surface hover:bg-white transition-colors"
            >
              {copy.auth.signIn}
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav indicator bar */}
      <nav className="sm:hidden flex items-center justify-around border-t border-surface-border/50 py-2.5 bg-surface-raised/40">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                isActive
                  ? "text-tier-notable"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
