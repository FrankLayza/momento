/**
 * src/app/advanced/page.tsx
 * Redesigned Advanced settings page for the Chidi persona using Emil Kowalski's soft UI style.
 *
 * Implements the Chidi path from Implementation Guide §6.
 * Technical vocabulary is permitted on this page only (PRD LR-1).
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserById } from "@/server/db/queries";
import { ExportWalletSection } from "./ExportWalletSection";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Advanced Settings | Momento",
};

export const revalidate = 0; // Dynamic/SSR only to check active user wallet

export default async function AdvancedPage() {
  // 1. Get current auth user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?next=/advanced&reason=default');
  }
  let pubkey: string | null = null;
  let displayName = "Fan";
  try {
    const appUser = await getUserById(user.id);
    pubkey = appUser?.pubkey ?? null;
    displayName = appUser?.displayName || user.email?.split("@")[0] || "Fan";
  } catch (err) {
    console.error("[AdvancedPage] Failed to load user metadata:", err);
  }

  return (
    <>
      <Navbar displayName={displayName} userId={user.id} />
      <main className="min-h-screen pb-16 sm:pb-12 font-body" style={{ background: 'var(--color-base)' }}>
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-12">
          {/* Header block */}
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: 'var(--color-fore-3)' }}>
              Settings
            </p>
            <h1 className="font-display text-[44px] leading-none tracking-wide" style={{ color: 'var(--color-fore)' }}>
              ADVANCED
            </h1>
            <p className="text-xs font-semibold mt-2.5 max-w-md leading-relaxed" style={{ color: 'var(--color-fore-2)' }}>
              Configure direct, non-custodial access to your Solana wallet. Designed for advanced collectors.
            </p>
          </div>

          {/* Wallet Info Card */}
          <section className="rounded-2xl p-6 sm:p-7 mb-5 shadow-xs bg-white border border-cream-border/60">
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-cream-border/40">
              <div className="p-1.5 bg-ink/5 rounded-lg text-ink-secondary/70">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" ry="2"/><path d="M12 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10-3h-4"/></svg>
              </div>
              <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink-secondary">
                Your Embedded Wallet
              </h2>
            </div>
            <ExportWalletSection pubkey={pubkey} />
          </section>

          {/* On-Chain Records Card */}
          <section className="rounded-2xl p-6 sm:p-7 shadow-xs bg-white border border-cream-border/60">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-cream-border/40">
              <div className="p-1.5 bg-ink/5 rounded-lg text-ink-secondary/70">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <h2 className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink-secondary">
                On-Chain Records
              </h2>
            </div>
            <p className="text-xs leading-relaxed text-ink-secondary/80">
              Every claimed Moment is minted as a compressed NFT (cNFT) on the Solana devnet.
              Solscan transaction signatures and asset links are viewable directly on the Moment detail pages.
            </p>
            <div className="mt-4.5 pt-1">
              <a
                href="https://solscan.io/?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue hover:text-blue/80 transition-colors select-none group/link"
              >
                <span>Explore Solscan Devnet</span>
                <svg className="w-3.5 h-3.5 opacity-70 group-hover/link:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              </a>
            </div>
          </section>

          {/* Footnote */}
          <p className="mt-8 text-[10px] text-center leading-relaxed text-ink-secondary/50 font-medium px-4">
            v1 utilizes secure server-side key custody derived from service credentials for zero-friction sign-ups.
            Production migration path: transition key derivation to non-custodial systems like Privy or Web3Auth.
          </p>
        </div>
      </main>
    </>
  );
}
