"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next ?? "/")}`;

  async function handleEmail() {
    if (!email.trim() || emailLoading) return;
    setEmailLoading(true);
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (otpError) throw otpError;
      setSent(true);
    } catch (err) {
      console.error("[SignInForm] Passwordless OTP sign-in failed:", err);
      setError(
        "Failed to send sign-in link. Please check your email and try again.",
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      console.error("[SignInForm] Google OAuth sign-in failed:", err);
      setError("Failed to connect to Google.");
      setGoogleLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center font-body py-6 space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-[#00917A]">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </div>
        <div className="space-y-1">
          <p className="font-unbounded text-lg font-bold text-fore tracking-tight">
            Check your email
          </p>
          <p className="text-xs text-ink-secondary/80 leading-relaxed mt-1">
            We sent a secure sign-in link to{" "}
            <span className="font-semibold text-fore underline decoration-cream-border">{email}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 font-body">
      {/* Email Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-secondary/40">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEmail()}
          disabled={emailLoading}
          className="w-full bg-cream-surface/20 border border-cream-border/75 rounded-xl pl-10 pr-4 py-3 text-[13px] text-ink placeholder:text-ink-secondary/40 outline-none focus:border-ink/30 focus:bg-cream-surface/30 transition-all font-body shadow-inner"
        />
      </div>

      {error && (
        <div className="text-[12px] text-live -mt-2 font-semibold flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Email Sign In Button - Electric Green */}
      <button
        onClick={handleEmail}
        disabled={emailLoading || !email.trim()}
        className="w-full bg-accent text-fore font-body font-bold text-[13px] rounded-xl py-3.5 tracking-wider uppercase hover:bg-[#00B046] hover:shadow-[0_0_15px_rgba(0,200,83,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
      >
        {emailLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-fore" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Sending...</span>
          </>
        ) : (
          <span>Continue with email</span>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-cream-border/50" />
        <span className="text-[10px] text-ink-secondary/40 font-bold uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-cream-border/50" />
      </div>

      {/* Google Sign In Button - Stadium Blue */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full bg-blue text-white font-body font-bold text-[13px] rounded-xl py-3.5 tracking-wider uppercase hover:bg-[#114BE3] hover:shadow-[0_0_15px_rgba(26,86,219,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
      >
        {googleLoading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>
    </div>
  );
}
