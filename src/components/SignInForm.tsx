'use client'
// Implements FR-2.3
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const callbackUrl =
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? '/')}`

  async function handleEmail() {
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      })
      if (otpError) throw otpError
      setSent(true)
    } catch (err) {
      console.error('[SignInForm] Passwordless OTP sign-in failed:', err)
      setError('Failed to send sign-in link. Please check your email and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callbackUrl },
      })
      if (oauthError) throw oauthError
    } catch (err) {
      console.error('[SignInForm] Google OAuth sign-in failed:', err)
      setError('Failed to connect to Google.')
      setLoading(false)
    }
  }

  /**
   * Evaluator-only bypass — signs in (or registers) a fixed demo account
   * without external SMTP. Never rendered outside local development.
   */
  async function handleMockSignIn() {
    setLoading(true)
    setError(null)

    const mockEmail = 'evaluator@momento.app'
    const mockPassword = 'EvaluatorPassword123!'

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mockEmail,
        password: mockPassword,
      })

      if (signInError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: mockEmail,
          password: mockPassword,
          options: { data: { display_name: 'Evaluator' } },
        })
        if (signUpError) {
          setError(signUpError.message)
          return
        }
      }

      // Ensure the embedded wallet exists — this path skips /auth/callback.
      await fetch('/api/auth/session-init', { method: 'POST' }).catch(() => undefined)

      router.push(next ?? '/')
      router.refresh()
    } catch (err) {
      console.error('[SignInForm] Evaluator sign-in failed:', err)
      setError('Failed to sign in with evaluator account.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center font-body">
        <p className="font-display text-[18px] font-bold text-ink mb-2">
          Check your email.
        </p>
        <p className="text-[14px] text-ink-secondary">
          We sent a sign-in link to <span className="font-semibold text-ink">{email}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 font-body">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleEmail()}
        disabled={loading}
        className="w-full bg-cream-surface border border-cream-border rounded-xl px-4 py-3.5 text-[14px] text-ink placeholder:text-ink-ghost outline-none focus:border-ink transition-colors font-body"
      />
      {error && <p className="text-[13px] text-live -mt-1.5">{error}</p>}
      <button
        onClick={handleEmail}
        disabled={loading || !email.trim()}
        className="w-full bg-ink text-cream font-display font-bold text-[14px] rounded-xl py-3.5 tracking-wide hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Sending...' : 'Continue with email'}
      </button>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-cream-border" />
        <span className="text-[11px] text-ink-ghost font-medium">or</span>
        <div className="flex-1 h-px bg-cream-border" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full border border-cream-border text-ink font-display font-bold text-[14px] rounded-xl py-3.5 tracking-wide hover:bg-cream-surface transition-colors disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Connecting...' : 'Continue with Google'}
      </button>

      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => { void handleMockSignIn() }}
          disabled={loading}
          className="mt-3 w-full text-center text-[11px] text-ink-ghost hover:text-ink-secondary transition-colors"
        >
          Quick evaluator sign-in (dev only)
        </button>
      )}
    </div>
  )
}
