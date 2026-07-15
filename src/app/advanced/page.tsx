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
      <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Advanced Settings
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          For collectors who want direct, non-custodial access to their Solana wallet.
        </p>
      </div>

      {/* Wallet info */}
      <section className="rounded-2xl border border-cream-border bg-cream-surface p-6 mb-6 shadow-sm">
        <h2 className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-5 border-b border-cream-border/60 pb-2">
          Your Embedded Wallet
        </h2>
        <ExportWalletSection pubkey={pubkey} />
      </section>

      {/* On-chain records */}
      <section className="rounded-2xl border border-cream-border bg-cream-surface p-6 shadow-sm">
        <h2 className="text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-4 border-b border-cream-border/60 pb-2">
          On-Chain Records
        </h2>
        <p className="text-xs text-ink-secondary leading-relaxed">
          Every claimed Moment is minted as a compressed NFT (cNFT) on the Solana devnet. 
          Solscan transaction signatures and asset links are viewable directly on the Moment detail pages.
        </p>
        <div className="mt-4">
          <a
            href="https://solscan.io/?cluster=devnet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-tier-notable hover:underline uppercase tracking-wider"
          >
            Explore Solscan Devnet →
          </a>
        </div>
      </section>

      {/* v1 trade-off notice */}
      <p className="mt-8 text-[10px] text-ink-muted text-center leading-relaxed">
        v1 utilizes secure server-side key custody derived from service credentials for zero-friction sign-ups. 
        Production migration path: transition key derivation to non-custodial systems like Privy or Web3Auth.
      </p>
    </main>
  </>
  );
}
