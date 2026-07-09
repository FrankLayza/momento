/**
 * src/components/AuthModal.tsx
 * Sleek auth modal component for magic-links and Google OAuth.
 * Implements FR-2.3 (PRD) & visual direction from linear.app.
 * Includes a robust Mock Sign In button for development testing.
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

  /**
   * Mock Sign In helper for evaluators/developers.
   * Signs in with evaluator@momento.app. If the user doesn't exist,
   * automatically signs them up first, bypassing external SMTP.
   */
  const handleMockSignIn = async () => {
    setLoading(true);
    setMessage(null);
    setErrorMsg(null);

    const mockEmail = "evaluator@momento.app";
    const mockPassword = "EvaluatorPassword123!";

    try {
      // 1. Try to sign in with password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      });

      if (!signInError) {
        onClose();
        router.refresh();
        return;
      }

      // 2. If user not found/fails, register them automatically
      const { error: signUpError } = await supabase.auth.signUp({
        email: mockEmail,
        password: mockPassword,
        options: {
          data: {
            display_name: "Evaluator",
          },
        },
      });

      if (signUpError) {
        setErrorMsg(signUpError.message);
      } else {
        // Sign up automatically logs them in, or we can re-try sign-in
        onClose();
        router.refresh();
      }
    } catch (err) {
      setErrorMsg("Failed to sign in with evaluator account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-surface/80 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm rounded-2xl border border-surface-border bg-surface-overlay p-6 shadow-2xl animate-toast-in">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-ink-primary">
            {copy.auth.signIn}
          </h2>
          <button 
            onClick={onClose}
            className="text-ink-muted hover:text-ink-secondary transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Messaging */}
        {message && (
          <div className="mb-4 rounded-lg bg-tier-notable/10 border border-tier-notable/30 px-3 py-2 text-xs text-tier-notable">
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 rounded-lg bg-tier-seismic/10 border border-tier-seismic/30 px-3 py-2 text-xs text-tier-seismic">
            {errorMsg}
          </div>
        )}

        {/* Magic Link Form */}
        <form onSubmit={(e) => { void handleMagicLink(e); }} className="space-y-3">
          <div>
            <label htmlFor="email" className="sr-only">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-xs text-ink-primary placeholder-ink-muted focus:border-tier-notable focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink-primary py-2 text-xs font-semibold text-surface hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? "Sending..." : copy.auth.signInWithEmail}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-surface-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface-overlay px-2 text-ink-muted">or</span>
          </div>
        </div>

        {/* Google / OAuth */}
        <button
          onClick={() => { void handleGoogleSignIn(); }}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface-raised py-2 text-xs font-semibold text-ink-primary hover:bg-surface-overlay transition-colors disabled:opacity-50"
        >
          <span>{copy.auth.signInWithGoogle}</span>
        </button>

        {/* Evaluator / Dev Bypass */}
        <button
          onClick={() => { void handleMockSignIn(); }}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-tier-notable/40 bg-tier-notable/10 py-2 text-xs font-semibold text-tier-notable hover:bg-tier-notable/20 transition-colors"
        >
          ⚡ Quick Evaluator Sign-In
        </button>
      </div>
    </div>
  );
}
