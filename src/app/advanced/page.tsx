/**
 * src/app/advanced/page.tsx
 * Advanced / export screen for Chidi persona.
 *
 * Technical vocabulary is permitted on this page only (PRD LR-1).
 * Greg never sees this page.
 * Implements the Chidi path from Implementation Guide §6.
 */

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Advanced — Momento" };

export default function AdvancedPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold mb-2">Advanced</h1>
      <p className="text-sm text-ink-secondary mb-8">
        For collectors who want direct Solana wallet access.
      </p>

      {/* Wallet info */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-6 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">
          Your embedded wallet
        </h2>

        {/* Public key display */}
        <div className="mb-4">
          <label className="block text-xs text-ink-muted mb-1">Public key</label>
          <div className="font-display text-xs break-all text-ink-secondary bg-surface border border-surface-border rounded-lg p-3">
            {/* TODO: fetch from session in Days 7-9 */}
            <span className="text-ink-muted">Sign in to view your public key</span>
          </div>
        </div>

        {/* Export secret key */}
        <div>
          <label className="block text-xs text-ink-muted mb-1">Export private key</label>
          <p className="text-xs text-ink-muted mb-3">
            Your private key lets you import this wallet into Phantom or any Solana wallet.
            Never share it. Momento stores it encrypted; this page decrypts it temporarily.
          </p>
          <button
            id="export-secret-key-button"
            disabled
            className="w-full rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm text-ink-secondary hover:border-tier-shock/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reveal private key (sign in required)
          </button>
        </div>
      </section>

      {/* Solscan links */}
      <section className="rounded-2xl border border-surface-border bg-surface-raised p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-4">
          On-chain records
        </h2>
        <p className="text-sm text-ink-secondary">
          Every claimed Moment is recorded as a compressed NFT on the Solana devnet.
          Solscan links are available in each Moment&apos;s detail view.
        </p>
        <a
          href="https://solscan.io/?cluster=devnet"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-tier-notable hover:underline"
        >
          Open Solscan (devnet) →
        </a>
      </section>

      {/* v1 trade-off notice */}
      <p className="mt-8 text-xs text-ink-muted text-center">
        v1 uses server-side key custody for simplicity.
        Production path: migrate to Privy or Web3Auth for non-custodial embedded wallets.
      </p>
    </main>
  );
}
