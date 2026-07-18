/**
 * src/app/advanced/page.tsx
 * Advanced / export screen for Chidi persona.
 *
 * Technical vocabulary is permitted on this page only (PRD LR-1).
 * Greg never sees this page.
 * Implements the Chidi path from Implementation Guide §6.
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
      <main className="min-h-screen pb-16 sm:pb-0 font-body" style={{ background: 'var(--color-base)' }}>
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--color-fore-3)' }}>Settings</p>
        <h1 className="font-display text-[40px] leading-none" style={{ color: 'var(--color-fore)' }}>
          ADVANCED
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-fore-2)' }}>
          For collectors who want direct, non-custodial access to their Solana wallet.
        </p>
      </div>

      {/* Wallet info */}
      <section className="rounded-2xl p-6 mb-4 shadow-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-[10px] font-bold tracking-[0.14em] uppercase mb-5 pb-2" style={{ color: 'var(--color-fore-3)', borderBottom: '1px solid var(--color-border-muted)' }}>
          Your Embedded Wallet
        </h2>
        <ExportWalletSection pubkey={pubkey} />
      </section>

      {/* On-chain records */}
      <section className="rounded-2xl p-6 shadow-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h2 className="text-[10px] font-bold tracking-[0.14em] uppercase mb-4 pb-2" style={{ color: 'var(--color-fore-3)', borderBottom: '1px solid var(--color-border-muted)' }}>
          On-Chain Records
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-fore-2)' }}>
          Every claimed Moment is minted as a compressed NFT (cNFT) on the Solana devnet.
          Solscan transaction signatures and asset links are viewable directly on the Moment detail pages.
        </p>
        <div className="mt-4">
          <a
            href="https://solscan.io/?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider hover:underline"
            style={{ color: 'var(--color-blue)' }}
          >
            Explore Solscan Devnet →
          </a>
        </div>
      </section>

      <p className="mt-8 text-[10px] text-center leading-relaxed" style={{ color: 'var(--color-fore-3)' }}>
        v1 utilizes secure server-side key custody derived from service credentials for zero-friction sign-ups.
        Production migration path: transition key derivation to non-custodial systems like Privy or Web3Auth.
      </p>
    </div>
    </main>
    </>
  );
}
