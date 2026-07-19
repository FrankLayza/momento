# Momento

**You were watching. Now you can prove it.**

Momento turns the exact moment a World Cup match shocked the world into a digital keepsake — only claimable by the fans who were watching live, with rarity computed automatically from TxLINE's real-time win-probability data and ownership recorded as compressed NFTs (cNFTs) on Solana.

---

## ⚽ Problem & Solution

### The Problem
Fans experience extraordinary live moments — a 94th-minute winner, a red card that flips a match, or a 50-to-1 shock victory. Currently, their only artifact is a screenshot that anyone could capture retroactively. There is no cryptographic or verifiable way to prove: *"I was watching when that happened."*

### The Solution
Momento introduces **Proof-of-Witness**:
1. **Check In**: Fans check in to a live World Cup fixture before or during kick-off to register as a **Witness**.
2. **Detect**: The **Moment Engine** ingests real-time betting market data from **TxLINE**, calculating implied win probabilities and listening for qualifying triggers (Goals, Red Cards, Probability Quakes, and Full-Time Upsets).
3. **Mint & Claim**: When a Moment fires, its **Shock Score** (0–100) and **Rarity Tier** (Common, Notable, Shock, Seismic) are calculated deterministically. Only checked-in Witnesses can claim a limited-edition cNFT directly to their embedded Solana wallet.
4. **Vault & Share**: Claimed keepsakes live in the fan's Vault and can be shared externally. Non-witnesses visiting a shared link see a public FOMO page inviting them to check in to upcoming matches.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 16 App Router (Vercel)                         │
│  ├── /app (UI pages & Server Components)               │
│  ├── /api (checkin, claim, wallet/export, og)          │
│  └── proxy.ts (Supabase Session Refresh & Routing)     │
└───────────┬──────────────────────────┬──────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────────────────────────────────────────┐
│  Supabase (Postgres DB + SSR Auth)                        │
│  users · matches · checkins · moments · editions          │
└───────────▲──────────────────────────▲──────────────────┘
            │                          │
            │                          │
┌───────────┴──────────────────────────┴────────────────────┐
│  Engine Worker (Node.js Process)                          │
│  ├── TxLINE Real-time Odds & Score Streams                │
│  ├── Moment Engine (Triggers T1–T4 & Shock Score Calc)    │
│  └── Solana Mint Worker (Metaplex Bubblegum cNFTs)        │
└───────────────────────────────────────────────────────────┘
```

---

## ⚡ Moment Engine & Rarity Calculation

### Triggers (FR-3.1 – FR-3.4)
The engine monitors live fixtures and fires Moments under 4 criteria:
* **T1 — Goal**: Triggered on any goal event.
* **T2 — Red Card**: Triggered on any red card event.
* **T3 — Probability Quake**: Triggered when implied win probability shifts $\ge$15 percentage points within a 5-minute sliding window.
* **T4 — Full-Time Upset**: Triggered at full time if the winning team started with $<30\%$ pre-match win probability.

### Shock Score Formula (FR-4.1)
The Shock Score ($0 - 100$) is computed deterministically with zero human or AI bias:

$$\text{Base Score} = 55 \times \text{Swing} + 30 \times \text{Surprise} + 15 \times \text{Lateness}$$

* **Swing**: Implied win probability shift $|P_{\text{after}} - P_{\text{before}}|$.
* **Surprise**: Inverse pre-event likelihood $(1 - P_{\text{before}})$.
* **Lateness**: Exponential scaling after the 60th minute $\text{clamp}(\frac{\text{minute} - 60}{30}, 0, 1)$.

### Rarity Tiers (FR-4.2)
| Tier | Score Range | Visual Accent | Description |
| :--- | :--- | :--- | :--- |
| **Common** | `0` – `39` | Neutral Silver | Standard goals and expected events |
| **Notable** | `40` – `64` | Cyan | Significant mid-game turns |
| **Shock** | `65` – `84` | Amber / Foil | Unlikely shifts and major upsets |
| **Seismic** | `85` – `100` | Crimson-Gold Gradient | Ultra-rare, historic last-minute World Cup miracles |

---

## 📡 TxLINE API Integration & Feedback

All TxLINE API communications are encapsulated inside `src/server/txline/adapter.ts`.

### Endpoints Used
1. **`POST /auth/guest/start`**: Obtains a guest JWT for authenticating downstream API calls.
2. **`GET /api/matches/world-cup`**: Fetches current live and scheduled World Cup 2026 fixtures.
3. **`GET /api/odds/prematch/{matchId}`**: Obtains pre-match baseline win/draw/loss probabilities.
4. **`GET /api/scores/snapshot/{matchId}`**: Ingests real-time match events, minutes, and score deltas.
5. **`GET /api/odds/history/{matchId}`**: Fetches historical tick history for sliding-window probability calculations.

### Feedback & Observations
* **High Reliability**: Snapshot endpoints provide fast, structured event streams.
* **Format Consistency**: Prematch probability snapshots normalized cleanly to 0..1 floating point values.
* **Suggestion**: Providing a dedicated WebSocket stream for odds ticks alongside scores snapshot polling would further decrease latency for sub-second probability quakes.

---

## 🛠️ Technology Stack

* **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion.
* **Backend & Auth**: Next.js Server Actions & API Routes, `@supabase/ssr` (Cookie session refresh in `proxy.ts`).
* **Database**: Supabase Postgres (`users`, `matches`, `checkins`, `moments`, `editions`).
* **Blockchain & Solana**: Metaplex Bubblegum (Compressed NFTs), `@solana/web3.js`, `@metaplex-foundation/umi`, AES-256-GCM encrypted custodial key derivation for zero-friction user onboarding (with key export option on `/advanced`).

---

## 🚀 Local Development Setup

### Prerequisites
* Node.js 20+
* pnpm (`npm i -g pnpm`)
* A Supabase Project

### Installation & Environment
```bash
# 1. Clone repo
git clone https://github.com/FrankLayza/momento.git
cd momento

# 2. Install dependencies
pnpm install

# 3. Environment configuration
cp .env.example .env.local
```

Fill in `.env.local` with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TXLINE_BASE_URL=https://txline-dev.txodds.com
TXLINE_API_KEY=your_txline_key
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database & Solana Setup
```bash
# 1. Apply Supabase Schema
# Execute src/server/db/schema.sql in your Supabase SQL Editor.

# 2. Generate Solana Treasury Keypair
pnpm gen:treasury
# Copy the printed TREASURY_SECRET_KEY to .env.local

# 3. Fund Treasury on Devnet
solana airdrop 2 <TREASURY_PUBKEY> --url devnet

# 4. Create Bubblegum Merkle Tree on Devnet
pnpm create:tree
# Copy the printed MERKLE_TREE_ADDRESS to .env.local
```

### Running the Application
```bash
# Start Web Server (Terminal 1)
pnpm dev

# Start Engine Worker (Terminal 2)
pnpm worker
```

---

## 🧪 Testing & Validation

```bash
# Run unit tests (Score calculations & trigger formulas)
pnpm test

# Run TypeScript type check
pnpm typecheck

# Run Copy/Vocabulary Scanner (Ensures zero forbidden crypto jargon on public screens)
pnpm scan-copy
```

### Replay Mode (For Demonstrations & Judging)
To drive the full engine loop from pre-recorded match data:
```bash
REPLAY_MODE=true pnpm worker
```

---

## 🔒 v1 Architecture Trade-offs & Production Path

| Feature | v1 Hackathon Implementation | Production Migration Path |
| :--- | :--- | :--- |
| **Key Custody** | AES-256-GCM encrypted server-side wallets (Derived from `SUPABASE_SERVICE_ROLE_KEY`) | Privy / Web3Auth MPC Non-Custodial Wallets |
| **NFT Storage** | Self-hosted metadata endpoints on Next.js | Decentralized IPFS / Arweave storage via Bundlr |
| **Network** | Solana Devnet | Solana Mainnet-Beta |
| **Minting** | Metaplex Bubblegum (cNFTs for near-zero gas costs) | Metaplex Bubblegum with automatic compressed tree scaling |

---

## 🏆 Submission Details

* **Track**: Consumer & Fan Experiences — TxODDS World Cup Hackathon (Superteam Earn)
* **License**: MIT
