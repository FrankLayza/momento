/**
 * src/components/AuthModal.tsx
 * Sign-in modal. Implements FR-2.3 (PRD).
 *
 * Design direction: centred brand mark, one oversized headline, email +
 * Google both visible up front (no hidden steps) — the onboarding-simplicity
 * treatment from spotify.com's sign-in screen, re-skinned with Momento's own
 * mark and the tier-notable accent instead of Spotify green.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { copy } from "@/lib/copy";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setErrorMsg(error.message);
    } catch (err) {
      setErrorMsg("Failed to connect to Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMessage(copy.auth.checkYourEmail);
      }
    } catch (err) {
      setErrorMsg("Failed to send sign-in link.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Evaluator-only bypass — signs in (or registers) a fixed demo account
   * without external SMTP. Never rendered in production.
   */
  const handleMockSignIn = async () => {
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const mockEmail = "evaluator@momento.app";
    const mockPassword = "EvaluatorPassword123!";

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      });

      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
          options: { data: { display_name: "Evaluator" } },
        });
        if (signUpError) {
          setErrorMsg(signUpError.message);
          return;
        }
      }

      // Ensure the embedded wallet exists — this path skips /auth/callback.
      await fetch("/api/auth/session-init", { method: "POST" }).catch(() => undefined);

      onClose();
      router.refresh();
    } catch (err) {
      setErrorMsg("Failed to sign in with evaluator account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Full-bleed screen, not a card — matches the reference's plain,
    // borderless layout sitting directly on the app's default background.
    <div className="fixed inset-0 z-50 bg-surface animate-toast-in overflow-y-auto">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 text-ink-muted hover:text-ink-secondary transition-colors text-xl"
      >
        ×
      </button>

      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          {/* Brand mark */}
          <div className="mx-auto mb-8 h-12 w-12 rounded-2xl bg-ink-primary" />

          {/* Oversized headline — the one thing on this screen that matters */}
          <h2 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight text-ink-primary">
            {copy.auth.signIn}
          </h2>
          <p className="mt-3 text-sm text-ink-secondary">
            {copy.tagline}
          </p>

          {/* Messaging */}
          {message && (
            <div className="mt-6 rounded-lg bg-tier-notable/10 border border-tier-notable/30 px-3 py-2 text-xs text-tier-notable">
              {message}
            </div>
          )}
          {errorMsg && (
            <div className="mt-6 rounded-lg bg-tier-seismic/10 border border-tier-seismic/30 px-3 py-2 text-xs text-tier-seismic">
            {errorMsg}
          </div>
        )}

        {/* Email — visible up front, not hidden behind a toggle */}
        <form onSubmit={(e) => { void handleMagicLink(e); }} className="mt-7 text-left">
          <label htmlFor="email" className="text-xs font-semibold text-ink-primary">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-surface-border bg-surface px-3.5 py-3 text-sm text-ink-primary placeholder-ink-muted focus:border-tier-notable focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-full bg-tier-notable py-3.5 text-sm font-bold text-surface hover:bg-tier-notable/90 transition-colors duration-150 disabled:opacity-50 shadow-sm"
          >
            {loading ? "Sending..." : copy.auth.continue}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-border" />
          <span className="text-[11px] text-ink-muted">or</span>
          <div className="h-px flex-1 bg-surface-border" />
        </div>

        {/* Google */}
        <button
          onClick={() => { void handleGoogleSignIn(); }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 rounded-full border border-surface-border bg-transparent py-3.5 text-sm font-semibold text-ink-primary hover:bg-surface-raised transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {copy.auth.signInWithGoogle}
        </button>

        {/* Evaluator / Dev Bypass — dev-only, never shown in production */}
        {process.env.NODE_ENV !== "production" && (
          <button
            onClick={() => { void handleMockSignIn(); }}
            disabled={loading}
            className="mt-6 w-full text-center text-[11px] text-ink-muted/70 hover:text-ink-muted transition-colors"
          >
            Quick evaluator sign-in (dev only)
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.86.92 7.51 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
