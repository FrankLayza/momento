/**
 * src/app/advanced/ExportWalletSection.tsx
 * Redesigned Advanced wallet export component using the Emil Kowalski design philosophy.
 * Implements FR-2.3 (PRD) — Chidi path.
 *
 * Utilizes a soft, clean UI with precise typography, custom SVG icons,
 * transition animations, and high-fidelity interactive states.
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
      } else if (res.status === 401) {
        // Session expired — redirect to re-authenticate
        window.location.href = "/sign-in?next=/advanced&reason=session_expired";
      } else {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Failed to decrypt private key. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!pubkey) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-ink-secondary/70">Sign in to view your advanced wallet settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Public Key Display */}
      <div className="group/field">
        <label className="block text-[11px] font-bold tracking-[0.12em] text-ink-secondary uppercase mb-2">
          Public Address
        </label>
        <div className="flex gap-2.5 items-stretch">
          <div className="flex-1 font-mono text-[13px] break-all text-ink bg-cream-surface/30 border border-cream-border/60 rounded-xl p-3.5 select-all leading-normal flex items-center shadow-inner transition-colors focus-within:border-ink/20">
            {pubkey}
          </div>
          <button
            onClick={() => { void handleCopyPub(); }}
            className={`px-4 rounded-xl border font-body text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-200 select-none active:scale-[0.97]
              ${copiedPub
                ? "bg-accent/15 border-accent text-accent-dim bg-[#00C853]/10 border-[#00C853] text-[#00917A]"
                : "bg-white border-cream-border/70 text-ink hover:bg-cream-surface/20 hover:border-cream-border hover:shadow-xs"
              }`}
          >
            {copiedPub ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                <span>Copied</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Private Key Reveal */}
      <div className="group/field">
        <label className="block text-[11px] font-bold tracking-[0.12em] text-ink-secondary uppercase mb-1">
          Private Wallet Key
        </label>
        <p className="text-xs text-ink-secondary/70 mb-4 leading-relaxed max-w-lg">
          Your private key grants full ownership of this wallet and your editions.
          Never share it. You can import this key directly into Phantom or any Solana wallet.
        </p>

        {revealed && privateKey ? (
          <div className="space-y-3">
            <div className="flex gap-2.5 items-stretch">
              <div className="flex-1 font-mono text-[13px] break-all text-[#E03C28] bg-[#FEE9E7]/40 border border-[#E03C28]/20 rounded-xl p-3.5 leading-normal flex items-center shadow-inner">
                {privateKey}
              </div>
              <button
                onClick={() => { void handleCopyPriv(); }}
                className={`px-4 rounded-xl border font-body text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-200 select-none active:scale-[0.97]
                  ${copiedPriv
                    ? "bg-accent/15 border-accent text-accent-dim bg-[#00C853]/10 border-[#00C853] text-[#00917A]"
                    : "bg-white border-cream-border/70 text-ink hover:bg-cream-surface/20 hover:border-cream-border hover:shadow-xs"
                  }`}
              >
                {copiedPriv ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <button
              onClick={() => {
                setRevealed(false);
                setPrivateKey(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary/70 hover:text-ink transition-colors cursor-pointer group/hide select-none"
            >
              <svg className="w-3.5 h-3.5 text-ink-secondary/50 group-hover/hide:text-ink transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Hide private key</span>
            </button>
          </div>
        ) : showWarning ? (
          <div className="rounded-2xl border border-[#E03C28]/25 bg-[#FEE9E7]/30 p-5 space-y-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-[#E03C28]/10 rounded-lg text-[#E03C28] shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#E03C28] uppercase tracking-wider">
                  Critical Security Notice
                </p>
                <p className="text-xs text-ink-secondary leading-relaxed">
                  Revealing your private key allows anyone to transfer your items and access your wallet. 
                  Only proceed if you are in a private space and understand the risks.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 pl-8">
              <button
                onClick={() => { void handleReveal(); }}
                disabled={loading}
                className="rounded-xl bg-[#E03C28] text-white px-4 py-2.5 text-xs font-bold hover:bg-[#E03C28]/90 transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-[0.98] select-none"
              >
                {loading ? "Decrypting..." : "I understand, reveal private key"}
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="rounded-xl border border-cream-border bg-white text-ink-secondary px-4 py-2.5 text-xs font-bold hover:bg-cream-surface/20 transition-all cursor-pointer shadow-xs active:scale-[0.98] select-none"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowWarning(true)}
            className="w-full rounded-xl border border-cream-border/80 bg-white text-ink px-4 py-3 text-xs font-bold hover:bg-cream-surface/10 hover:border-cream-border hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 select-none active:scale-[0.99]"
          >
            <svg className="w-4 h-4 text-ink-secondary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            <span>Reveal private key</span>
          </button>
        )}
      </div>
    </div>
  );
}
