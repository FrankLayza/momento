# DEVIATIONS from canonical file tree

This file tracks every deliberate deviation from the canonical file tree
defined in Implementation Guide §4.

| File / Path | Reason | Date |
|---|---|---|
| `scripts/gen-treasury.ts` | Added: helper to generate a Solana devnet treasury keypair and print the base58 secret key for `.env`. Not in the original spec but needed for first-time setup. | 2026-07-09 |
| `scripts/activate-txline.ts` | Added: one-shot script to submit the TxOracle on-chain subscription and activate a TxLINE API token. Outputs `TXLINE_BASE_URL` and `TXLINE_API_KEY` for `.env.local`. Replaces the need for `scripts/gen-treasury.ts` if run first (it also generates the keypair). | 2026-07-09 |
| `@coral-xyz/anchor` (devDep) | Required by `activate-txline.ts` to interact with the TxOracle Anchor program on-chain. | 2026-07-09 |
| `@solana/spl-token` (devDep) | Required by `activate-txline.ts` for ATA (associated token account) derivation. | 2026-07-09 |
| `axios` (devDep) | Required by `activate-txline.ts` for HTTP calls to the TxLINE REST API. | 2026-07-09 |
| `tweetnacl` (devDep) | Required by `activate-txline.ts` for signing the activation message with the keypair. | 2026-07-09 |
| `@supabase/ssr` (dep) | Required by user's `src/utils/supabase/client.ts` and `middleware.ts`. Caused `@supabase/supabase-js` to upgrade from `2.45.4` → `2.110.2`. | 2026-07-09 |
| `src/middleware.ts` | Added at `src/` (not root). Next.js App Router locates middleware by checking both `src/middleware.ts` and root `middleware.ts`. | 2026-07-09 |
| `src/app/auth/callback/route.ts` | Added: required by `@supabase/ssr`'s PKCE flow to exchange the magic-link/Google OAuth `code` for a session cookie. Also provisions the embedded wallet on first sign-in (§6). | 2026-07-10 |
| `src/app/api/auth/session-init/route.ts` | Added: idempotent wallet-provisioning endpoint for sign-in paths that don't round-trip through `/auth/callback` (the dev-only mock sign-in). | 2026-07-10 |
| `alter publication supabase_realtime add table moments;` (schema.sql) | Added: required for `WitnessNotifications.tsx` to receive Moment INSERTs via Supabase Realtime (FR-5.1). Must be run once against the live project — direct `psql` access from this environment could not resolve the project's DB host; run via the Supabase SQL editor. | 2026-07-10 |

> Rules: if a new file is genuinely needed, add it under the closest
> existing folder and document it here (Implementation Guide §0, rule 6).
