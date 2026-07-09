/**
 * src/server/chain/mintEdition.ts
 * Implements §8 (Implementation Guide) — per-claim cNFT mint via Bubblegum.
 *
 * Called by api/claim/route.ts after DB-side eligibility checks pass (FR-5.2, FR-5.3).
 * Mints one compressed NFT edition of a Moment to the claimant's embedded public key.
 *
 * Mint failures MUST NOT lose the claim:
 *   - Edition row is created as "pending_chain" before calling this function.
 *   - On failure, the row stays "pending_chain" and the worker retries.
 *   - The fan sees "Claimed. Verified and permanent." immediately either way.
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  mintToCollectionV1,
  mplBubblegum,
  parseLeafFromMintToCollectionV1Transaction,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  createSignerFromKeypair,
  generateSigner,
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import type { Moment } from "@/lib/types";

// ── Config ────────────────────────────────────────────────────────────────────

function getTreasuryKeypair(): Keypair {
  const raw = process.env.TREASURY_SECRET_KEY;
  if (!raw) throw new Error("Missing TREASURY_SECRET_KEY");
  // Import bs58 dynamically to avoid issues in edge runtime
  const bs58 = require("bs58") as { decode: (s: string) => Uint8Array };
  return Keypair.fromSecretKey(bs58.decode(raw));
}

function getMerkleTreeAddress(): string {
  const addr = process.env.MERKLE_TREE_ADDRESS;
  if (!addr) throw new Error("Missing MERKLE_TREE_ADDRESS — run pnpm create:tree first");
  return addr;
}

function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
}

// ── Metadata URI builder ──────────────────────────────────────────────────────
//
// Self-hosted JSON is fine for devnet.
// Production path: upload to IPFS/Arweave (noted in README as v1 trade-off).

function buildMetadataUri(moment: Moment): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/metadata/${moment.id}`;
}

function buildNftName(moment: Moment, home: string, away: string): string {
  const eventLabel =
    moment.trigger === "T1" ? "Goal"
    : moment.trigger === "T2" ? "Red card"
    : moment.trigger === "T3" ? "Probability shift"
    : "Full-time upset";

  return `${home} v ${away} · ${moment.minute}' ${eventLabel}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface MintEditionResult {
  assetId: string;
  txSig:   string;
}

/**
 * Mints one compressed NFT edition of a Moment to the claimant's public key.
 * Implements FR-5.3 (PRD), §8 (Implementation Guide).
 *
 * @param moment    The Moment being claimed.
 * @param toPubkey  The claimant's embedded Solana public key (base58).
 * @param home      Home team name (for NFT name metadata).
 * @param away      Away team name.
 */
export async function mintEdition(
  moment: Moment,
  toPubkey: string,
  home: string,
  away: string
): Promise<MintEditionResult> {
  const treasuryKeypair = getTreasuryKeypair();
  const treeAddress     = getMerkleTreeAddress();
  const rpcUrl          = getRpcUrl();

  // Set up Umi with the treasury identity
  const umi = createUmi(rpcUrl).use(mplBubblegum());
  const umiKeypair = fromWeb3JsKeypair(treasuryKeypair);
  const signer     = createSignerFromKeypair(umi, umiKeypair);
  umi.use(keypairIdentity(signer));

  const metadataUri = buildMetadataUri(moment);
  const nftName     = buildNftName(moment, home, away);

  // Mint cNFT to the claimant's public key
  // [NEEDS-HUMAN-INPUT if Bubblegum API changes between versions]
  const { signature, result } = await mintToCollectionV1(umi, {
    leafOwner:   umiPublicKey(toPubkey),
    merkleTree:  umiPublicKey(treeAddress),
    // Collection mint — [NEEDS-HUMAN-INPUT: set COLLECTION_MINT_ADDRESS env once created]
    collectionMint: umiPublicKey(
      process.env.COLLECTION_MINT_ADDRESS ?? treeAddress
    ),
    metadata: {
      name:    nftName,
      symbol:  "MMT",
      uri:     metadataUri,
      sellerFeeBasisPoints: 500,  // 5% royalty (roadmap; devnet only for now)
      collection: {
        key:      umiPublicKey(process.env.COLLECTION_MINT_ADDRESS ?? treeAddress),
        verified: false,
      },
      creators: [],
    },
  }).sendAndConfirm(umi);

  // Extract the on-chain asset id from the transaction
  const leaf = await parseLeafFromMintToCollectionV1Transaction(umi, signature);
  const assetId = leaf.id.toString();
  const txSig   = Buffer.from(signature).toString("base64");

  return { assetId, txSig };
}
