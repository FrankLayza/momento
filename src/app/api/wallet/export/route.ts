/**
 * src/app/api/wallet/export/route.ts
 * API route to securely reveal a user's embedded Solana private key.
 * Implements FR-2.3 Chidi path & §6 (Implementation Guide).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBase58Secret } from "@/server/chain/wallets";

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[ExportWallet] Auth error:", authError.message);
  }
  if (!user) {
    console.warn("[ExportWallet] No authenticated user — session may have expired.");
    return NextResponse.json(
      { error: "Unauthorized — please sign in again." },
      { status: 401 }
    );
  }

  try {
    const privateKey = await getBase58Secret(user.id);
    return NextResponse.json({ privateKey });
  } catch (err: any) {
    console.error("[ExportWallet] Failed for user", user.id, ":", err?.message ?? err);
    return NextResponse.json(
      { error: "Failed to export wallet credentials." },
      { status: 500 }
    );
  }
}
