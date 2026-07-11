/**
 * src/app/advanced/page.tsx
 * Advanced / export screen for Chidi persona.
 *
 * Technical vocabulary is permitted on this page only (PRD LR-1).
 * Greg never sees this page.
 * Implements the Chidi path from Implementation Guide §6.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getUserById } from "@/server/db/queries";
import { ExportWalletSection } from "./ExportWalletSection";

export const metadata: Metadata = {
  title: "Advanced Settings | Momento",
};

export const revalidate = 0; // Dynamic/SSR only to check active user wallet

export default async function AdvancedPage() {
  // 1. Get current auth user session
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let pubkey: string | null = null;
  if (user) {
    try {
      const appUser = await getUserById(user.id);
      pubkey = appUser?.pubkey ?? null;
    } catch (err) {
      console.error("[AdvancedPage] Failed to load user pubkey:", err);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-primary">
          Advanced Settings
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          For collectors who want direct, non-custodial access to their Solana wallet.
        </p>
      </div>

      {/* Wallet info */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-6 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-secondary mb-5 border-b border-surface-border/40 pb-2">
          Your Embedded Wallet
        </h2>
        <ExportWalletSection pubkey={pubkey} />
      </section>

      {/* On-chain records */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-secondary mb-4 border-b border-surface-border/40 pb-2">
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
  );
}
