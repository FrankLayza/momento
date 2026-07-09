/**
 * scripts/activate-txline.ts
 *
 * One-shot script: generates (or loads) a Solana keypair, submits a free-tier
 * on-chain subscription, and activates a TxLINE API token.
 *
 * Run once. Paste the printed TXLINE_API_KEY and TXLINE_BASE_URL into .env.local.
 *
 * Usage:
 *   pnpm activate:txline                         # devnet (default)
 *   pnpm activate:txline -- --network mainnet    # mainnet real-time tier
 *   pnpm activate:txline -- --keypair ./my.json  # use existing keypair file
 *
 * DEVIATION: @coral-xyz/anchor, @solana/spl-token, axios, tweetnacl added as
 * devDependencies for this activation script. See docs/DEVIATIONS.md.
 *
 * Implements: Implementation Guide §2 (env vars) and TxLINE on-chain auth flow.
 */

import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import axios from "axios";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Load .env.local so SOLANA_RPC_URL is available
loadEnv({ path: path.resolve(".env.local") });
loadEnv({ path: path.resolve(".env") }); // fallback

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

const networkArg = args.includes("--network")
  ? args[args.indexOf("--network") + 1]
  : "devnet";

const keypairArg = args.includes("--keypair")
  ? args[args.indexOf("--keypair") + 1]
  : null;

// --rpc overrides env + config default (useful for testing)
const rpcOverride = args.includes("--rpc")
  ? args[args.indexOf("--rpc") + 1]
  : null;

if (networkArg !== "mainnet" && networkArg !== "devnet") {
  console.error("--network must be 'mainnet' or 'devnet'");
  process.exit(1);
}

const NETWORK = networkArg as "mainnet" | "devnet";

// ── Network config ────────────────────────────────────────────────────────────

const CONFIG = {
  mainnet: {
    // Primary: env var. Fallback: official mainnet.
    rpcUrl:       process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    apiOrigin:    "https://txline.txodds.com",
    programId:    new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
  },
  devnet: {
    // Primary: env var. Fallback: Ankr free devnet (more reliable than api.devnet.solana.com).
    rpcUrl:       process.env.SOLANA_RPC_URL ?? "https://rpc.ankr.com/solana_devnet",
    apiOrigin:    "https://txline-dev.txodds.com",
    programId:    new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
  },
} as const;

// Free tier: Service Level 1 (60s delay, both networks).
// Use 12 for real-time on mainnet (also free per track rules).
const SERVICE_LEVEL_ID = NETWORK === "mainnet" ? 12 : 1;
const DURATION_WEEKS    = 4;
const SELECTED_LEAGUES: number[] = [];  // empty = standard World Cup bundle

const { rpcUrl: configRpcUrl, apiOrigin, programId, txlTokenMint } = CONFIG[NETWORK];
// CLI flag wins, then env var (already baked into config), then config default
const rpcUrl = rpcOverride ?? configRpcUrl;
const apiBaseUrl = `${apiOrigin}/api`;

console.log(`     RPC: ${rpcUrl}`);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Loads a keypair from a JSON file, or generates and saves a fresh one.
 * NOTE: must be async because we use await inside.
 */
async function loadOrCreateKeypair(): Promise<{ keypair: Keypair; keypairPath: string }> {
  const keypairPath = keypairArg
    ? path.resolve(keypairArg)
    : path.resolve("treasury.json");

  if (fs.existsSync(keypairPath)) {
    console.log(`\n[1/5] Loading keypair from ${keypairPath}`);
    const raw = JSON.parse(fs.readFileSync(keypairPath, "utf-8")) as number[];
    return { keypair: Keypair.fromSecretKey(Uint8Array.from(raw)), keypairPath };
  }

  console.log(`\n[1/5] Generating new keypair → ${keypairPath}`);
  const keypair = Keypair.generate();
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));

  const secretBase58 = bs58.encode(keypair.secretKey);
  console.log(`     Public key:  ${keypair.publicKey.toBase58()}`);
  console.log(`     Secret key (base58) — add to .env.local as TREASURY_SECRET_KEY:`);
  console.log(`     ${secretBase58}`);

  return { keypair, keypairPath };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nTxLINE activation — network: ${NETWORK}`);
  console.log(`Program:    ${programId.toBase58()}`);
  console.log(`Token mint: ${txlTokenMint.toBase58()}`);
  console.log(`API origin: ${apiOrigin}`);

  // ── Step 1: Keypair ───────────────────────────────────────────────────────
  const { keypair } = await loadOrCreateKeypair();
  console.log(`     Using pubkey: ${keypair.publicKey.toBase58()}`);

  // ── Step 2: Connection + devnet airdrop ───────────────────────────────────
  console.log(`\n[2/5] Connecting to Solana ${NETWORK}...`);
  const connection = new Connection(rpcUrl, "confirmed");

  if (NETWORK === "devnet") {
    const balance = await connection.getBalance(keypair.publicKey);
    if (balance < 10_000_000) {
      console.log("     Balance low — requesting airdrop (2 SOL)...");
      try {
        const sig = await connection.requestAirdrop(keypair.publicKey, 2_000_000_000);
        await connection.confirmTransaction(sig, "confirmed");
        console.log(`     Airdrop confirmed: ${sig}`);
      } catch {
        console.warn("     Airdrop failed (rate-limited?). Balance:", balance / 1e9, "SOL");
        if (balance < 1_000_000) {
          console.error("     Not enough SOL. Get devnet SOL from https://faucet.solana.com");
          process.exit(1);
        }
      }
    } else {
      console.log(`     Balance OK: ${(balance / 1e9).toFixed(4)} SOL`);
    }
  }

  // ── Step 3: Load Anchor IDL ────────────────────────────────────────────────
  console.log(`\n[3/5] Loading TxOracle IDL...`);

  const localIdlPath = path.resolve(`src/server/txline/idl/txoracle-${NETWORK}.json`);
  let txoracleIdl: anchor.Idl;

  if (fs.existsSync(localIdlPath)) {
    txoracleIdl = JSON.parse(fs.readFileSync(localIdlPath, "utf-8")) as anchor.Idl;
    console.log(`     Loaded IDL from ${localIdlPath}`);
  } else {
    console.log(`     IDL not found locally — fetching from GitHub...`);

    // Try devnet-specific IDL first, then fall back to main IDL
    const idlUrls = [
      `https://raw.githubusercontent.com/txodds/tx-on-chain/main/idl/txoracle-${NETWORK}.json`,
      "https://raw.githubusercontent.com/txodds/tx-on-chain/main/idl/txoracle.json",
    ];

    let fetched = false;
    for (const idlUrl of idlUrls) {
      try {
        console.log(`     Trying: ${idlUrl}`);
        const resp  = await axios.get<anchor.Idl>(idlUrl);
        txoracleIdl = resp.data;
        fs.mkdirSync(path.dirname(localIdlPath), { recursive: true });
        fs.writeFileSync(localIdlPath, JSON.stringify(txoracleIdl, null, 2));
        console.log(`     IDL saved to ${localIdlPath}`);
        fetched = true;
        break;
      } catch {
        console.log(`     Not found at that URL — trying next...`);
      }
    }

    if (!fetched) {
      throw new Error(
        `Could not fetch TxOracle IDL. Please download it manually and save to:\n  ${localIdlPath}`
      );
    }
  }

  const walletWrapper = new anchor.Wallet(keypair);
  const provider      = new anchor.AnchorProvider(connection, walletWrapper, { commitment: "confirmed" });
  anchor.setProvider(provider);

  // Use the correct program ID for this network, regardless of what the IDL says
  // (The GitHub IDL may be tagged with the mainnet program ID; methods/accounts are the same)
  const program = new anchor.Program(txoracleIdl!, provider);

  console.log(`     IDL program: ${program.programId.toBase58()}`);
  console.log(`     Expected:    ${programId.toBase58()}`);
  if (!program.programId.equals(programId)) {
    console.warn(`     ⚠  Program ID mismatch — patching IDL to use ${NETWORK} program ID...`);
    // Patch the IDL's address so Anchor uses the correct on-chain program
    (txoracleIdl! as { address?: string }).address = programId.toBase58();
  }
  // Re-create program with (potentially patched) IDL
  const finalProgram = new anchor.Program(txoracleIdl!, provider);
  console.log(`     Using program: ${finalProgram.programId.toBase58()}`);

  // ── Step 4: On-chain subscription ────────────────────────────────────────
  console.log(`\n[4/5] Submitting on-chain subscription (SL ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS} weeks)...`);

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    finalProgram.programId
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    finalProgram.programId
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    txlTokenMint,
    provider.wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
  if (!tokenAccountInfo) {
    console.log("     User token account not initialized. Initializing...");
    const createAtaTx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        userTokenAccount,
        provider.wallet.publicKey,
        txlTokenMint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    const createAtaSig = await provider.sendAndConfirm(createAtaTx);
    console.log(`     ✓ Created user token account: ${createAtaSig}`);
  } else {
    console.log("     User token account already initialized.");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txSig: string = await (finalProgram.methods as any)
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user:                   provider.wallet.publicKey,
      pricingMatrix:          pricingMatrixPda,
      tokenMint:              txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram:           TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:          SystemProgram.programId,
    })
    .rpc();

  console.log(`     ✓ Subscription tx: ${txSig}`);
  const explorerBase = NETWORK === "devnet"
    ? `https://explorer.solana.com/tx/${txSig}?cluster=devnet`
    : `https://explorer.solana.com/tx/${txSig}`;
  console.log(`     Explorer: ${explorerBase}`);

  // ── Step 5: Activate API token ────────────────────────────────────────────
  console.log(`\n[5/5] Activating TxLINE API token...`);

  const authResponse = await axios.post<{ token: string }>(`${apiOrigin}/auth/guest/start`);
  const jwt: string  = authResponse.data.token;
  console.log(`     Guest JWT obtained (${jwt.length} chars)`);

  const messageString    = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
  const message          = new TextEncoder().encode(messageString);
  const signatureBytes   = nacl.sign.detached(message, keypair.secretKey);
  const walletSignature  = Buffer.from(signatureBytes).toString("base64");

  const activationResponse = await axios.post<{ token: string } | string>(
    `${apiBaseUrl}/token/activate`,
    { txSig, walletSignature, leagues: SELECTED_LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );

  const apiToken: string =
    typeof activationResponse.data === "string"
      ? activationResponse.data
      : activationResponse.data.token;

  // ── Output ────────────────────────────────────────────────────────────────

  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUCCESS — add these to your .env.local:`);
  console.log(`${"=".repeat(60)}`);
  console.log(`TXLINE_BASE_URL=${apiOrigin}`);
  console.log(`TXLINE_API_KEY=${apiToken}`);
  console.log(`# Guest JWT (for reference — app regenerates at runtime):`);
  console.log(`# TXLINE_JWT=${jwt}`);
  console.log(`${"=".repeat(60)}`);
  console.log();
  console.log(`Network:          ${NETWORK}`);
  console.log(`Subscription tx:  ${txSig}`);
  console.log(`Service level:    ${SERVICE_LEVEL_ID} (${SERVICE_LEVEL_ID === 1 ? "60s delay — free" : "real-time — free"})`);
  console.log(`Duration:         ${DURATION_WEEKS} weeks`);
  console.log();
  console.log(`Verify with:`);
  console.log(`  curl -H "Authorization: Bearer ${jwt.slice(0, 20)}..." \\`);
  console.log(`       -H "X-Api-Token: ${String(apiToken).slice(0, 20)}..." \\`);
  console.log(`       "${apiBaseUrl}/fixtures/snapshot" | head -c 500`);
}

main().catch((err: unknown) => {
  const e = err as { response?: { data?: unknown }; message?: string };
  console.error("\nActivation failed:", e?.response?.data ?? e.message ?? err);
  process.exit(1);
});
