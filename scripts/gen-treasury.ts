/**
 * scripts/gen-treasury.ts
 * DEVIATION: Added to help with first-time setup (see docs/DEVIATIONS.md).
 *
 * Generates a new Solana devnet treasury keypair and prints the
 * base58-encoded secret key for your .env file.
 *
 * Usage:
 *   pnpm gen:treasury
 *
 * Then paste the output into TREASURY_SECRET_KEY in .env.local.
 * Keep this secret key safe — it controls minting authority.
 *
 * After generating, fund the treasury on devnet:
 *   solana airdrop 2 <PUBLIC_KEY> --url devnet
 */

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const keypair = Keypair.generate();
const secretKeyBase58 = bs58.encode(keypair.secretKey);

console.log("\n=== Momento Treasury Keypair (devnet) ===\n");
console.log(`Public key:  ${keypair.publicKey.toBase58()}`);
console.log(`Secret key:  ${secretKeyBase58}`);
console.log("\n─────────────────────────────────────────");
console.log("Add this to your .env.local:\n");
console.log(`TREASURY_SECRET_KEY=${secretKeyBase58}`);
console.log("\nThen fund this address on devnet:");
console.log(`solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet`);
console.log("\n⚠  Never commit this key to git.");
console.log("=".repeat(42) + "\n");
