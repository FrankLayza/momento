/**
 * src/components/Navbar.tsx
 * Global header navigation bar.
 * Implements FR-2.3 (Auth state display) & visual direction from Linear.app (§12) —
 * sentence-case links, generous spacing, a divider before account actions, and
 * one pill-shaped primary action rather than a bordered button.
 */

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { User } from "@supabase/supabase-js";
import { copy } from "@/lib/copy";
import { Avatar } from "./Avatar";

function displayNameFor(user: User): string {
  const meta = user.user_metadata ?? {};
  return (
    (typeof meta["display_name"] === "string" && meta["display_name"]) ||
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    user.email?.split("@")[0] ||
    "Fan"
  );
}

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

  // Hide global navbar on the landing page (when logged out and at root "/")
  // Also return null while loading to prevent a flash of the navbar on initial load.
  if (pathname === "/") {
    if (loading || !user) return null;
  }

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
    <header className="sticky top-0 z-40 w-full border-b border-surface-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 h-16">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="h-6 w-6 rounded-full bg-ink-primary transition-transform group-hover:rotate-12 duration-200" />
          <span className="font-display text-lg font-semibold tracking-tight text-ink-primary">
            {copy.appName}
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden sm:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-ink-primary font-medium"
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
            <div className="h-9 w-20 rounded-full bg-surface-raised animate-pulse" />
          ) : user ? (
            <>
              <span className="hidden md:flex items-center gap-2">
                <Avatar name={displayNameFor(user)} size="sm" />
                <span className="text-sm text-ink-secondary truncate max-w-[120px]">
                  {displayNameFor(user)}
                </span>
              </span>
              <span className="hidden sm:block h-4 w-px bg-surface-border" />
              <button
                onClick={() => { void handleSignOut(); }}
                className="text-sm text-ink-secondary hover:text-ink-primary transition-colors"
              >
                {copy.auth.signOut}
              </button>
            </>
          ) : (
            <>
              <span className="hidden sm:block h-4 w-px bg-surface-border" />
              <button
                onClick={handleSignInClick}
                className="rounded-full bg-ink-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-white transition-colors"
              >
                {copy.auth.signIn}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile nav indicator bar */}
      <nav className="sm:hidden flex items-center justify-around border-t border-surface-border/40 py-2 bg-surface-raised/60">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[9px] font-semibold uppercase tracking-widest transition-colors ${
                isActive
                  ? "text-ink-primary font-bold"
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
