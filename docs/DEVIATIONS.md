# DEVIATIONS from canonical file tree

This file tracks every deliberate deviation from the canonical file tree
defined in Implementation Guide §4.

| File / Path | Reason | Date |
|---|---|---|
| `scripts/gen-treasury.ts` | Added: helper to generate a Solana devnet treasury keypair and print the base58 secret key for `.env`. Not in the original spec but needed for first-time setup. | 2026-07-09 |

> Rules: if a new file is genuinely needed, add it under the closest
> existing folder and document it here (Implementation Guide §0, rule 6).
