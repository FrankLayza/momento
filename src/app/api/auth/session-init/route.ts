/**
 * src/app/api/auth/session-init/route.ts
 * Idempotent: ensures the signed-in user has a Momento user row + embedded
 * wallet. Called client-side right after a sign-in that doesn't round-trip
 * through /auth/callback (e.g. the password-based mock sign-in path).
 * Implements FR-2.3 (PRD) & §6 (Implementation Guide).
 *
 * Not in the canonical file tree (Implementation Guide §4). Logged in
 * docs/DEVIATIONS.md.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { ensureWalletForUser } from "@/server/chain/wallets";

export async function POST() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureWalletForUser(user);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/auth/session-init] Failed:", err);
    return NextResponse.json({ error: "Failed to initialise session." }, { status: 500 });
  }
}
