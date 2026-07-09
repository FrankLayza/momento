/**
 * src/app/api/wallet/export/route.ts
 * API route to securely reveal a user's embedded Solana private key.
 * Implements FR-2.3 Chidi path & §6 (Implementation Guide).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getBase58Secret } from "@/server/chain/wallets";

export async function POST() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const privateKey = await getBase58Secret(user.id);
    return NextResponse.json({ privateKey });
  } catch (err: any) {
    console.error("[ExportWallet] Failed:", err);
    return NextResponse.json(
      { error: "Failed to export wallet credentials." },
      { status: 500 }
    );
  }
}
