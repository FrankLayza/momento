/**
 * src/server/chain/wallets.ts
 * Implements §6 (Implementation Guide) — embedded custodial Solana wallets.
 *
 * On first sign-in, createFor(userId) is called:
 *   1. Generate a fresh Solana Keypair.
 *   2. Encrypt the secret key with AES-256-GCM using a key derived from
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   3. Store ciphertext + public key on the users row.
 *
 * The user (Greg persona) never sees any of this.
 * Chidi can export via the /advanced page.
 *
 * NOTE: This is an acceptable v1 trade-off for a devnet hackathon.
 * Production path: migrate to Privy or Web3Auth for non-custodial embedded wallets.
 */

import { Keypair } from "@solana/web3.js";
import * as crypto from "node:crypto";
import { upsertUser, getEncryptedSecret, getUserById } from "@/server/db/queries";

// ── Encryption helpers ────────────────────────────────────────────────────────

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES  = 32;
const IV_BYTES   = 12;
const SALT       = "momento-wallet-v1"; // static salt; key is per-environment

/**
 * Derives a 32-byte encryption key from SUPABASE_SERVICE_ROLE_KEY.
 * Uses PBKDF2 so the raw JWT secret is never used directly as a key.
 */
function deriveEncryptionKey(): Buffer {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return crypto.pbkdf2Sync(
    serviceKey,
    SALT,
    100_000,  // iterations
    KEY_BYTES,
    "sha256"
  );
}

function encrypt(plaintext: Buffer): string {
  const key = deriveEncryptionKey();
  const iv  = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all base64url)
  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

function decrypt(ciphertext: string): Buffer {
  const key = deriveEncryptionKey();
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");

  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("wallets: malformed ciphertext");
  }

  const iv       = Buffer.from(ivB64,  "base64url");
  const authTag  = Buffer.from(tagB64, "base64url");
  const data     = Buffer.from(dataB64,"base64url");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(data), decipher.final()]);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates and stores an embedded Solana wallet for a new user.
 * Called on first sign-in (FR-2.3, §6).
 * Idempotent if called again for the same userId.
 */
export async function createFor(
  userId: string,
  displayName: string
): Promise<{ pubkey: string }> {
  const keypair    = Keypair.generate();
  const pubkey     = keypair.publicKey.toBase58();
  const secretKey  = Buffer.from(keypair.secretKey);  // 64 bytes
  const encSecret  = encrypt(secretKey);

  await upsertUser({ id: userId, displayName, pubkey, encSecret });

  return { pubkey };
}

/**
 * Decrypts and returns the Keypair for a user.
 * Used by mintEdition.ts when minting on behalf of the user,
 * and by the /advanced page when Chidi exports his key.
 */
export async function getKeypair(userId: string): Promise<Keypair> {
  const encSecret = await getEncryptedSecret(userId);
  if (!encSecret) throw new Error(`wallets: no keypair found for user ${userId}`);

  const secretKey = decrypt(encSecret);
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

/**
 * Returns the base58 secret key for the /advanced export screen.
 * Implements FR-2.3 Chidi path (Implementation Guide §6).
 */
export async function getBase58Secret(userId: string): Promise<string> {
  const keypair = await getKeypair(userId);
  // Convert Uint8Array secret key to base58
  const bs58 = await import("bs58");
  return bs58.default.encode(keypair.secretKey);
}

/**
 * Ensures a Momento user row + embedded wallet exists for a freshly
 * authenticated Supabase user. Idempotent — safe to call on every sign-in.
 * Implements FR-2.3 (PRD) — wallet creation is invisible to the fan.
 */
export async function ensureWalletForUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const existing = await getUserById(user.id);
  if (existing) return; // already provisioned

  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta["display_name"] === "string" && meta["display_name"]) ||
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    user.email?.split("@")[0] ||
    "Fan";

  await createFor(user.id, displayName);
}
