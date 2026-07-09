/**
 * scripts/create-tree.ts
 * One-time Merkle tree creation on Solana devnet.
 * Implements §8 (Implementation Guide).
 *
 * Creates a Bubblegum Merkle tree with:
 *   maxDepth = 14  → capacity 16,384 editions (ample for the demo)
 *   maxBufferSize = 64
 *
 * Usage:
 *   pnpm create:tree
 *
 * Prerequisites:
 *   1. TREASURY_SECRET_KEY must be set in .env.local
 *   2. Treasury must have devnet SOL: solana airdrop 2 <PUBKEY> --url devnet
 *
 * Output: prints MERKLE_TREE_ADDRESS — add to .env.local
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createTree,
  mplBubblegum,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

async function main() {
  const secretKeyRaw = process.env.TREASURY_SECRET_KEY;
  if (!secretKeyRaw) {
    console.error("❌ TREASURY_SECRET_KEY not set. Run: pnpm gen:treasury first.");
    process.exit(1);
  }

  const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyRaw));

  console.log(`\n=== Creating Merkle Tree on devnet ===`);
  console.log(`Treasury: ${treasuryKeypair.publicKey.toBase58()}`);
  console.log(`RPC:      ${rpcUrl}\n`);

  const umi        = createUmi(rpcUrl).use(mplBubblegum());
  const umiKeypair = fromWeb3JsKeypair(treasuryKeypair);
  const signer     = createSignerFromKeypair(umi, umiKeypair);
  umi.use(keypairIdentity(signer));

  const merkleTree = generateSigner(umi);

  console.log(`Creating tree at: ${merkleTree.publicKey}\n`);

  const builder = await createTree(umi, {
    merkleTree,
    maxDepth:      14,   // 2^14 = 16,384 leaf capacity
    maxBufferSize: 64,
  });

  await builder.sendAndConfirm(umi);

  console.log("✅ Merkle tree created!\n");
  console.log("Add this to your .env.local:\n");
  console.log(`MERKLE_TREE_ADDRESS=${merkleTree.publicKey.toString()}`);
  console.log("\n" + "=".repeat(42) + "\n");
}

main().catch(err => {
  console.error("❌ create-tree failed:", err);
  process.exit(1);
});
