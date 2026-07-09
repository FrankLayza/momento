# Momento

**You were watching. Now you can prove it.**

Momento turns the exact moment a World Cup match shocked the world into a digital keepsake — only claimable by the fans who were watching live, with rarity computed automatically from TxLINE's real-time win-probability data and ownership recorded on Solana.

---

## Problem

Fans experience extraordinary live moments (a 94th-minute winner, a red card that flips a match) and their only artefact is a screenshot anyone can fake. There is no way to prove "I was watching when that happened".

## How it works

1. Fan opens Momento and sees today's World Cup fixtures.
2. Fan **Checks in** to a match — they become a Witness.
3. The Moment Engine watches TxLINE for qualifying events (goals, red cards, probability shifts, full-time upsets).
4. A Moment is created with a shock score computed from win-probability data.
5. Every Witness receives a notification. They **Claim** the Moment with one tap.
6. Fan **Shares** the Moment card to WhatsApp or X. Non-witnesses see FOMO copy and the next fixtures.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js 14 App (Vercel)                                │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │ /app (UI pages) │  │ /api (claim, checkin, og)    │  │
│  └────────┬────────┘  └──────────────┬───────────────┘  │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌───────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Realtime + Auth)                    │
│  users · matches · checkins · moments · editions          │
└───────────────────────────────────────────────────────────┘
            ▲                          ▲
            │                          │
┌───────────┴───────────────────────────────────────────────┐
│  Worker (Node 20 — Railway / Render)                      │
│  Moment Engine → TxLINE adapter → Bubblegum mint          │
└───────────────────────────────────────────────────────────┘
```

## TxLINE endpoints used

> [NEEDS-HUMAN-INPUT: list real endpoints after reading docs/TXLINE-NOTES.md]

All TxLINE calls are isolated in `src/server/txline/adapter.ts`.

## Solscan devnet links

> [NEEDS-HUMAN-INPUT: add after minting during development]

Example format: `https://solscan.io/tx/{TX_SIG}?cluster=devnet`

## Local development

### Prerequisites

- Node 20+
- pnpm (`npm i -g pnpm`)
- A Supabase project (free tier)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/FrankLayza/momento
cd momento
pnpm install

# 2. Generate a treasury keypair
pnpm gen:treasury
# Copy TREASURY_SECRET_KEY output to .env.local

# 3. Copy .env.example → .env.local and fill in all values
cp .env.example .env.local

# 4. Run the Supabase schema migration
# Paste src/server/db/schema.sql into your Supabase SQL editor and run it.

# 5. Create the Merkle tree on devnet (one-time)
# Fund treasury first: solana airdrop 2 <TREASURY_PUBKEY> --url devnet
pnpm create:tree
# Copy MERKLE_TREE_ADDRESS output to .env.local

# 6. Start the web app
pnpm dev

# 7. Start the worker (separate terminal)
pnpm worker
```

### Running tests

```bash
pnpm test           # vitest run
pnpm scan-copy      # forbidden vocabulary CI check
pnpm typecheck      # tsc --noEmit
```

### Replay Mode

To drive the full product loop from a recorded fixture (required for judging):

```bash
REPLAY_MODE=true pnpm worker
```

Record a live match first:
```bash
pnpm record:match --matchId <TXLINE_MATCH_ID>
```

## Monetisation path

1. **Premium claims**: Seismic-tier Moments carry a small claim fee (paid in fiat; fan never sees crypto).
2. **Secondary royalties**: 5% on-chain royalty when trading ships.
3. **B2B issuance**: clubs and broadcasters issue branded Moments on Momento rails.

The moat: sealed Witness records accumulate from day one and cannot be recreated retroactively by a competitor.

## TxLINE API feedback

> [NEEDS-HUMAN-INPUT: complete this section after using the TxLINE API in production.
> This section is required by the hackathon submission rules.]

- Endpoints used:
- Latency observed:
- Data quality notes:
- Suggested improvements:

## v1 trade-offs and production path

| Trade-off | v1 approach | Production path |
|---|---|---|
| Key custody | Server-side AES-256-GCM | Privy or Web3Auth |
| NFT storage | Self-hosted JSON metadata | IPFS / Arweave |
| Chain | Solana devnet | Solana mainnet |
| Worker hosting | Railway free tier | Dedicated compute |

## Submission

**Track**: Consumer and Fan Experiences — TxODDS World Cup Hackathon (Superteam Earn)
**Deadline**: 19 July 2026
