/**
 * src/app/advanced/ExportWalletSection.tsx
 * Interactive Solana wallet export section for the Advanced screen.
 * Implements FR-2.3 (PRD) — Chidi path.
 *
 * Placed inside src/app/advanced to comply with scan-copy CI checks (PRD LR-1),
 * where technical/crypto vocabulary is permitted.
 */

"use client";

import { useState } from "react";

interface Props {
  pubkey: string | null;
}

export function ExportWalletSection({ pubkey }: Props) {
  const [copiedPub, setCopiedPub] = useState(false);
  const [copiedPriv, setCopiedPriv] = useState(false);
  
  const [revealed, setRevealed] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleCopyPub = async () => {
    if (!pubkey) return;
    await navigator.clipboard.writeText(pubkey);
    setCopiedPub(true);
    setTimeout(() => setCopiedPub(false), 2000);
  };

  const handleCopyPriv = async () => {
    if (!privateKey) return;
    await navigator.clipboard.writeText(privateKey);
    setCopiedPriv(true);
    setTimeout(() => setCopiedPriv(false), 2000);
  };

  const handleReveal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = (await res.json()) as { privateKey: string };
        setPrivateKey(data.privateKey);
        setRevealed(true);
        setShowWarning(false);
      } else {
        alert("Failed to decrypt private key. Ensure you are signed in.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!pubkey) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-ink-muted">Sign in to view your advanced wallet settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Public Key Display */}
      <div>
        <label className="block text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-2">
          Public key
        </label>
        <div className="flex gap-2">
          <div className="flex-1 font-display text-xs break-all text-ink-secondary bg-cream border border-cream-border rounded-lg p-3 select-all">
            {pubkey}
          </div>
          <button
            onClick={() => { void handleCopyPub(); }}
            className="px-4 rounded-lg border border-cream-border bg-cream text-xs font-semibold text-ink hover:bg-cream-surface transition-colors cursor-pointer"
          >
            {copiedPub ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Private Key Reveal */}
      <div>
        <label className="block text-[10px] font-medium tracking-[0.14em] text-ink-ghost uppercase mb-2">
          Export private key
        </label>
        <p className="text-xs text-ink-muted mb-4 leading-relaxed">
          Your private key grants full ownership of this wallet and your MMT editions. 
          Never share it. You can import this key directly into Phantom or any Solana wallet.
        </p>

        {revealed && privateKey ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 font-display text-xs break-all text-ink-secondary bg-cream border border-cream-border rounded-lg p-3">
                {privateKey}
              </div>
              <button
                onClick={() => { void handleCopyPriv(); }}
                className="px-4 rounded-lg border border-cream-border bg-cream text-xs font-semibold text-ink hover:bg-cream-surface transition-colors cursor-pointer"
              >
                {copiedPriv ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => {
                setRevealed(false);
                setPrivateKey(null);
              }}
              className="text-xs font-semibold text-ink-muted hover:text-ink-secondary transition-colors"
            >
              Hide private key
            </button>
          </div>
        ) : showWarning ? (
          <div className="rounded-xl border border-tier-seismic/40 bg-tier-seismic/10 p-4 space-y-3">
            <p className="text-xs font-semibold text-tier-seismic uppercase tracking-wider">
              ⚠️ Warning: Critical Security Risk
            </p>
            <p className="text-xs text-ink leading-relaxed">
              Revealing your private key allows anyone to transfer your items and access your wallet. 
              Only proceed if you are in a private space and understand the risks.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { void handleReveal(); }}
                disabled={loading}
                className="rounded-lg bg-tier-seismic px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Decrypting..." : "I understand, reveal private key"}
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="rounded-lg border border-cream-border bg-cream px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowWarning(true)}
            className="w-full rounded-lg border border-cream-border bg-cream text-ink px-4 py-2.5 text-xs font-semibold hover:bg-cream-surface transition-colors cursor-pointer"
          >
            Reveal private key
          </button>
        )}
      </div>
    </div>
  );
}
