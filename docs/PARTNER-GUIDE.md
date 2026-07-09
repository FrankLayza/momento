# Momento — Partner Technical Guide & Progress Report

Welcome! This guide is designed to get you up to speed with the **Momento** development environment, explain the technical architecture in plain English, and outline our progress.

---

## 📢 Team Guidelines (Read This First!)

1. **Working on Branches:** 
   To avoid conflicts and messy merge histories, **always create a new feature branch** for your work. Never commit directly to `main`.
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Reference the Core Spec Files:**
   Refer to the original **`Momento-PRD.md`** and **`Momento-Implementation-Guide.md`** for feature specifications. 
   *(Note: These files contain proprietary details and are git-ignored so they are not pushed to GitHub. Make sure you keep them locally in your workspace.)*
3. **Keep Docs Updated:**
   If you implement a new feature, change the schema, or add a dependency, please **update this document** and log any codebase deviations in `docs/DEVIATIONS.md`.

---

## 🛠️ Plain-English Technical Concepts

Here is a quick breakdown of the core systems we are building:

* **TxLINE Adapter (`src/server/txline/adapter.ts`):** 
  This is the *only* file in the application allowed to communicate with the TxLINE API. It Normalises external sports data (fixtures, odds, and scores) into clean TypeScript shapes so that the rest of the application doesn't have to deal with raw API formats.
* **The Worker / Moment Engine (`src/server/engine/worker.ts`):** 
  A continuously running Node process. It polls the sports feed, processes odds to find game-changing events, and calculates the **Shock Score** for game moments.
* **Shock Score Formula (`src/lib/score.ts`):** 
  A pure, deterministic math function that looks at how unlikely an event was (using pre-event vs. post-event win probabilities) and when it occurred to assign a score from 0–100.
* **Merkle Trees & cNFTs:** 
  To make minting collectibles affordable (fractions of a cent), we use Solana **compressed NFTs (cNFTs)**. A single Merkle Tree created on-chain handles all claims for the entire tournament.
* **Embedded Custodial Wallets (`src/server/chain/wallets.ts`):** 
  To hide the complexity of blockchain from casual fans, the backend automatically generates a Solana keypair for each user on sign-up, encrypts it using the Supabase Service Key, and stores it in the database. Advanced users can reveal and export their private keys.

---

## 📈 Current Project Progress (We are at Day 7)

We have successfully scaffolded the project, set up the database, and completed the core sports engine integration. 

| Feature / Step | Status | Description |
|---|---|---|
| **Project Scaffolding** | **Complete** | Folder structure, Tailwind configuration, TypeScript strict rules, and testing configurations are fully established. |
| **Solana Tree Setup** | **Complete** | Merkle tree initialized on Solana Devnet: `J6zFZwUgR4y2CzDrWGaspbd2sPApCun5y2CxcpvCHYCH`. |
| **TxLINE Activation** | **Complete** | Subscribed on-chain and registered API Token: `txoracle_api_86e80f9bae1b4702b3a4a9a20d2c3d18`. |
| **Database Schema** | **Complete** | Database tables (`users`, `matches`, `checkins`, `moments`, `editions`) created in Supabase with Row Level Security (RLS) active. |
| **Shock Score Formula** | **Complete** | Built in `src/lib/score.ts`. Verified by unit tests. |
| **Worker / Engine** | **Complete** | Worker automatically polls matches, updates database tables, and tracks live events. IPv6 connection timeouts have been resolved by forcing IPv4 DNS resolution. |
| **Frontend UI (v1)** | **In Progress** | Homepage listing upcoming fixtures and match details page with the Live Probability Bar are running. |
| **Check-in Interaction** | **In Progress** | Created `CheckinButton` with `localStorage` fallback to easily mock and test check-in states before auth is completely wired. |

---

## 🚀 Running the Project Locally

Make sure you copy the configuration values into your `.env.local` file (it is git-ignored):

```bash
# Get keys from the project owner or Supabase settings page
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

TREASURY_SECRET_KEY=your-solana-treasury-secret-key-base58
SOLANA_RPC_URL=https://api.devnet.solana.com
MERKLE_TREE_ADDRESS=your-merkle-tree-address
NEXT_PUBLIC_APP_URL=http://localhost:3000

TXLINE_BASE_URL=https://txline-dev.txodds.com
TXLINE_API_KEY=your-activated-txline-api-token
```

### Starting the Services
1. Run the local development server:
   ```bash
   pnpm dev
   ```
2. In a separate terminal, start the background worker:
   ```bash
   pnpm worker
   ```
