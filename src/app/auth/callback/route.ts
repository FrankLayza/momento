// Implements FR-2.3
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ensureWalletForUser } from '@/server/chain/wallets'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  // Security: reject external redirects
  const safePath = next.startsWith('/') ? next : '/'

  if (code) {
    try {
      const supabase = await createClient()
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[auth/callback] exchangeCodeForSession error:', error)
      } else if (session) {
        // Provision wallet separately — failure must not block sign-in
        try {
          await ensureWalletForUser(session.user)
        } catch (walletErr) {
          console.error('[auth/callback] wallet provisioning failed (non-fatal):', walletErr)
        }
      }
    } catch (err) {
      console.error('[auth/callback] auth callback failed:', err)
    }
  }

  return NextResponse.redirect(`${origin}${safePath}`)
}
