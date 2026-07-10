/**
 * src/app/auth/callback/route.ts
 * Exchanges the Supabase OAuth/magic-link `code` param for a session cookie,
 * then provisions the user's embedded wallet on first sign-in.
 * Implements FR-2.3 (PRD) & §6 (Implementation Guide).
 *
 * Not in the canonical file tree (Implementation Guide §4) — required for
 * @supabase/ssr's PKCE code-exchange flow. Logged in docs/DEVIATIONS.md.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ensureWalletForUser } from "@/server/chain/wallets";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      try {
        await ensureWalletForUser(data.user);
      } catch (err) {
        // Wallet provisioning failure must not block sign-in; log and continue.
        console.error("[auth/callback] ensureWalletForUser failed:", err);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed or no code present — send back to home with sign-in open.
  return NextResponse.redirect(`${origin}/?signin=1`);
}
