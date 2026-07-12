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
* **Supabase Client SDK Helpers (`src/lib/supabase/`):**
  Custom helpers `server.ts` and `client.ts` implementing standard Supabase Auth interactions. The server helper utilizes dynamic async cookies matching Next.js 15/16 requirements.

---

## 📈 Current Project Progress (Completed Setup)

We have completed the project scaffolding, database schema, sports/moment engines, page styling, and authentication protection gates.

| Feature / Step | Status | Description |
|---|---|---|
| **Project Scaffolding** | **Complete** | Folder structure, Next.js 16 App Router, TypeScript strict rules, Tailwind v4 theme configurations, and vitest testing configurations are fully established. |
| **Solana Tree Setup** | **Complete** | Merkle tree initialized on Solana Devnet: `J6zFZwUgR4y2CzDrWGaspbd2sPApCun5y2CxcpvCHYCH`. |
| **TxLINE Activation** | **Complete** | Subscribed on-chain and registered API Token: `txoracle_api_86e80f9bae1b4702b3a4a9a20d2c3d18`. |
| **Database Schema** | **Complete** | Database tables (`users`, `matches`, `checkins`, `moments`, `editions`) created in Supabase with Row Level Security (RLS) active. |
| **Shock Score Formula** | **Complete** | Built in `src/lib/score.ts`. Verified by unit tests. |
| **Worker / Engine** | **Complete** | Worker automatically polls matches, updates database tables, and tracks live events. IPv6 connection timeouts have been resolved by forcing IPv4 DNS resolution. |
| **Cream theme UI** | **Complete** | Fixtures dashboard page matches the cream-themed styling spec. Implemented `LiveTicketCard.tsx` stub card (featuring probability bars and custom barcode styles) and `UpcomingMatchRow.tsx`. |
| **Auth Setup & Sign-In** | **Complete** | Created Custom cardless `(auth)/sign-in` page and form handling Google OAuth and Passwordless Magic Link OTP. Refactored `/auth/callback` callback route to automate signup + custodial wallet keypair provisioning. |
| **Route Protection & Gates** | **Complete** | Applied server-side redirects on `/vault` and `/advanced` pages. Wired client action gates via custom `useCheckIn` redirect hook and non-rendering auto check-in listeners. Protected check-in and claim API routes under a `401 Unauthorized` gate. |
| **Cleanup & Refactoring** | **Complete** | Deleted legacy utility files `src/utils/supabase/*` and unused middleware files (`src/proxy.ts`), replacing them with active async-cookies client helpers. Verified build compilation. |
| **Landing Navigation Spacing**| **Complete** | Extracted `LandingNavbar` to a direct-child layout in `Landing.tsx` to maintain vertical layering above the interactive cover sheet. Spaced out layout and calibrated dynamic scroll transitions based on viewport coverage. |

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
