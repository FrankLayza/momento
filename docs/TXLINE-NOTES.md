# TxLINE API Notes
# Real TxLINE API Documentation — Pasted by human on 2026-07-09
# Source: https://txline.txodds.com (fetched live)
# This file is the single source of truth for adapter.ts internals.
# DO NOT invent any endpoint not listed here.

---

## 1. Networks & Base URLs

| Network | API Origin | Solana RPC |
|---------|-----------|------------|
| **mainnet** | `https://txline.txodds.com` | `https://api.mainnet-beta.solana.com` |
| **devnet** | `https://txline-dev.txodds.com` | `https://api.devnet.solana.com` |

**Momento uses devnet for the hackathon.** All adapter calls go to `https://txline-dev.txodds.com`.

All REST/SSE endpoints are under `${apiOrigin}/api/` — i.e. `https://txline-dev.txodds.com/api/`.

---

## 2. Solana Program Addresses

| Network | Program ID | TxL Token Mint |
|---------|-----------|----------------|
| mainnet | `9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA` | `Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL` |
| **devnet** | `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J` | `4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG` |

PDAs derived with seeds:
- Token treasury PDA: `["token_treasury_v2"]`
- Pricing matrix PDA: `["pricing_matrix"]`

---

## 3. Subscription & Auth Flow (one-time setup)

### Step 1 — Install deps
```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token axios tweetnacl
```

### Step 2 — Subscribe on-chain (free tier)

**Service Level 1** = World Cup + International Friendlies, 60-second delayed (free)
**Service Level 12** = World Cup + International Friendlies, real-time (free on mainnet; check devnet pricing matrix before using)

For hackathon purposes, use **Service Level 1** on devnet unless real-time is confirmed available there.

```typescript
const SERVICE_LEVEL_ID = 1;   // 60s delay, free
const DURATION_WEEKS = 4;
const SELECTED_LEAGUES: number[] = []; // empty = standard bundle

const txSig = await program.methods
  .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
  .accounts({
    user: provider.wallet.publicKey,
    pricingMatrix: pricingMatrixPda,
    tokenMint: txlTokenMint,
    userTokenAccount,
    tokenTreasuryVault,
    tokenTreasuryPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

No TxL token payment required for the free tier — the transaction still registers on-chain.

### Step 3 — Get guest JWT

```typescript
// POST to apiOrigin (no /api prefix here)
const authResponse = await axios.post(`${apiOrigin}/auth/guest/start`);
const jwt = authResponse.data.token;
```

### Step 4 — Activate API token

Message format: `"${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}"`
For empty SELECTED_LEAGUES this produces `"${txSig}::${jwt}"`.

```typescript
const messageString = `${txSig}:${SELECTED_LEAGUES.join(",")}:${jwt}`;
const message = new TextEncoder().encode(messageString);
const signatureBytes = nacl.sign.detached(message, keypair.secretKey);
const walletSignature = Buffer.from(signatureBytes).toString("base64");

const activationResponse = await axios.post(
  `${apiBaseUrl}/token/activate`,   // apiBaseUrl = ${apiOrigin}/api
  { txSig, walletSignature, leagues: SELECTED_LEAGUES },
  { headers: { Authorization: `Bearer ${jwt}` } }
);

const apiToken = activationResponse.data.token || activationResponse.data;
// Store apiToken in TXLINE_API_KEY env var
```

---

## 4. Request Headers (all data API calls)

```typescript
{
  "Authorization": `Bearer ${jwt}`,   // guest JWT from /auth/guest/start
  "X-Api-Token": apiToken,            // activated token from /api/token/activate
  "Content-Type": "application/json"
}
```

The guest JWT (`/auth/guest/start`) appears to be short-lived. The adapter must refresh it if it expires.
[NEEDS-HUMAN-INPUT: Confirm whether the guest JWT expires and what the TTL is, or whether it is session-persistent.]

---

## 5. Fixtures Endpoint

### GET `/api/fixtures/snapshot`

Returns all fixtures across all competitions, or filtered by competitionId.

```typescript
// All fixtures
GET /api/fixtures/snapshot

// World Cup only (find competitionId from fixture objects; World Cup is International)
GET /api/fixtures/snapshot?competitionId=<id>
```

**Response shape** (array of fixture objects):
```typescript
interface TxLineFixture {
  FixtureId: number;         // use as matchId (cast to string per NormalisedMatch)
  StartTime: number;         // Unix ms, NOT an ISO-8601 string (confirmed live 2026-07-11)
  Participant1: string;      // team name
  Participant2: string;      // team name
  Participant1Id: number;
  Participant2Id: number;
  Participant1IsHome: boolean; // true = Participant1 is home side
  Competition: string;       // confirmed: literally just "World Cup" — see note below
  CompetitionId: number;     // opaque numeric id (72 for World Cup on devnet)
  FixtureGroupId: number;    // opaque numeric id — no known human-readable mapping
  GameState: number;         // STALE — stays 1 ("NS") even for live matches, do not use
  Ts: number;                // Unix ms, feed timestamp of this snapshot row
}
```

**Real sample object** (Norway vs England, fetched live 2026-07-11):
```json
{
  "Ts": 1783306800000,
  "StartTime": 1783803600000,
  "Competition": "World Cup",
  "CompetitionId": 72,
  "FixtureGroupId": 10115675,
  "Participant1Id": 2661,
  "Participant1": "Norway",
  "Participant2Id": 1888,
  "Participant2": "England",
  "FixtureId": 18213979,
  "Participant1IsHome": true,
  "GameState": 1
}
```

**`Competition` field — confirmed, do not guess a richer format:** it is literally the string `"World Cup"` for every World Cup fixture, with no group/stage/matchday breakdown. `CompetitionId` and `FixtureGroupId` are opaque numeric ids with no confirmed human-readable mapping — do not attempt to derive a "Group A · Matchday 2"-style label from them. `NormalisedMatch.competition` is populated verbatim from this field (`raw.Competition ?? undefined`); UI callers must fall back to a generic label (e.g. "FIFA World Cup 2026") since this field alone isn't display-ready.

**Important note from docs:**
> `Participant1IsHome` is the feed's home/away designation. For the World Cup (neutral venues), `Participant1IsHome: true` means Participant1 is listed as the home side for feed purposes only — it is NOT a venue guarantee.

**Adapter mapping to NormalisedMatch:**
```typescript
home = fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2
away = fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1
id   = String(fixture.FixtureId)
kickoffUtc = new Date(fixture.StartTime).toISOString()  // StartTime is Unix ms, not ISO already
competition = fixture.Competition ?? undefined
```

Confirmed live 2026-07-11: the fixtures snapshot does NOT include status or score — those only come from `/api/scores/snapshot/{id}` (§7 below), consistent with adapter.ts's approach of probing scores separately for any fixture that may have kicked off.

---

## 6. Odds Endpoints

### GET `/api/odds/snapshot/${fixtureId}`

Returns the current odds snapshot for a single fixture.

```typescript
GET /api/odds/snapshot/17588310
```

[NEEDS-HUMAN-INPUT: Paste a real odds snapshot response to confirm the exact field names for decimal odds (home/draw/away), timestamp, and any market identifier. We need to know if it returns an array or a single object, and what the odds field names are (e.g. OddsHome, Odds1, etc.).]

### GET `/api/odds/updates/${epochDay}/${hourOfDay}/${interval}`

Returns odds updates for a time-window bucket.

```typescript
// epochDay = Math.floor(Date.now() / 86400000)
// hourOfDay = new Date().getUTCHours()
// interval = 0 (confirm valid values with human)
GET /api/odds/updates/20085/15/0
```

[NEEDS-HUMAN-INPUT: Confirm interval valid values (0, 1, 2...?), what the response array contains, and whether it filters by fixture or returns all fixtures in that window.]

### SSE `GET /api/odds/stream`

Real-time odds updates via Server-Sent Events.

```typescript
const streamResponse = await fetch(`${apiBaseUrl}/odds/stream`, {
  headers: {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
  },
});
// Parse with the SSE helper in Section 9 below.
```

[NEEDS-HUMAN-INPUT: Paste a real SSE odds stream message payload. Need to know: does a message include fixtureId? What are the field names for home/draw/away odds? Is the stream all-fixtures or per-fixture?]

---

## 7. Scores Endpoints

### GET `/api/scores/snapshot/${fixtureId}`

Current score snapshot for a fixture.

```typescript
GET /api/scores/snapshot/17588310
```

[NEEDS-HUMAN-INPUT: Paste a real scores snapshot response. Need to confirm field names for: current score (home goals, away goals), match phase/status, current minute, and any event list (goals, cards).]

### GET `/api/scores/updates/${fixtureId}`

Live score updates for a specific fixture (polling).

```typescript
GET /api/scores/updates/17588310
```

### GET `/api/scores/updates/${epochDay}/${hourOfDay}/${interval}`

Score updates for a time-window bucket (all fixtures).

```typescript
GET /api/scores/updates/20085/15/0
```

### GET `/api/scores/historical/${fixtureId}`

Full sequence of score updates for a completed fixture.
Only available for fixtures with start times **between 2 weeks and 6 hours ago**.

```typescript
GET /api/scores/historical/17952170
// Response: array of update objects with seq, ts, gameState fields
```

This is the key endpoint for `scripts/record-match.ts` and Replay Mode (FR-1.3).

### SSE `GET /api/scores/stream`

Real-time score events via Server-Sent Events.

```typescript
const streamResponse = await fetch(`${apiBaseUrl}/scores/stream`, {
  headers: {
    Authorization: `Bearer ${jwt}`,
    "X-Api-Token": apiToken,
    Accept: "text/event-stream",
    "Cache-Control": "no-cache",
    // optional: "Accept-Encoding": "gzip"  — reduces bandwidth 70-80%
    // if used, decompress with gunzipSync() from node:zlib before decode
  },
});
```

[NEEDS-HUMAN-INPUT: Paste a real SSE scores stream message. Need to confirm: event field names (goals, cards, phase changes), whether events include match minute, fixtureId, and team side (home/away). This is the primary trigger source for T1 (goal) and T2 (red card).]

---

## 8. Soccer Scores Encoding (for on-chain validation & stat interpretation)

### Game Phase IDs

| ID | Code | Meaning |
|----|------|---------|
| 1  | NS   | Not started |
| 2  | H1   | First half in play |
| 3  | HT   | Halftime |
| 4  | H2   | Second half in play |
| 5  | F    | Finished (full time) |
| 6  | WET  | Waiting for Extra Time |
| 7  | ET1  | Extra Time first half |
| 8  | HTET | Extra Time halftime |
| 9  | ET2  | Extra Time second half |
| 10 | FET  | Finished after Extra Time |
| 11 | WPE  | Waiting for Penalty Shootout |
| 12 | PE   | Penalty Shootout in progress |
| 13 | FPE  | Finished after Penalty Shootout |
| 14 | I    | Interrupted |
| 15 | A    | Abandoned |
| 16 | C    | Cancelled |
| 17 | TXCC | TX Coverage Cancelled |
| 18 | TXCS | TX Coverage Suspended |
| 19 | P    | Postponed |

**Adapter mapping to NormalisedMatch.status:**
- NS → `"scheduled"`
- H1, HT, H2, WET, ET1, HTET, ET2, WPE, PE → `"live"`
- F, FET, FPE → `"finished"`
- I, A, C, TXCC, TXCS, P → treat as `"scheduled"` and log warning

**NormalisedMatch.minute mapping:** derive from game phase + elapsed time
[NEEDS-HUMAN-INPUT: Confirm how the scores feed reports match minute. Is it a direct field (e.g. `minute: 73`) or must it be derived from phase start timestamp?]

### Stat Encoding Formula (on-chain validation)

`encoded_key = (period * 1000) + base_key`

Full-game stat base keys:
| Key | Stat |
|-----|------|
| 1   | Participant 1 total goals |
| 2   | Participant 2 total goals |
| 3   | Participant 1 total yellow cards |
| 4   | Participant 2 total yellow cards |
| 5   | Participant 1 total red cards |
| 6   | Participant 2 total red cards |
| 7   | Participant 1 total corners |
| 8   | Participant 2 total corners |

Period multipliers: H1=1000, H2=2000, ET1=3000, ET2=4000, PE=5000

---

## 9. SSE Parsing Helper (copy into adapter.ts)

```typescript
type SseMessage = {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
};

function parseSseBlock(block: string): SseMessage | null {
  const message: SseMessage = { data: "" };
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;
    const separatorIndex = rawLine.indexOf(":");
    const field = separatorIndex === -1 ? rawLine : rawLine.slice(0, separatorIndex);
    const value = separatorIndex === -1
      ? ""
      : rawLine.slice(separatorIndex + 1).replace(/^ /, "");
    if (field === "data") message.data += `${value}\n`;
    if (field === "event") message.event = value;
    if (field === "id") message.id = value;
    if (field === "retry") message.retry = Number(value);
  }
  message.data = message.data.replace(/\n$/, "");
  return message.data || message.event || message.id ? message : null;
}

async function* readSseMessages(response: Response): AsyncGenerator<SseMessage> {
  if (!response.body) throw new Error("Stream response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separator = buffer.match(/\r?\n\r?\n/);
      while (separator?.index !== undefined) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const message = parseSseBlock(block);
        if (message) yield message;
        separator = buffer.match(/\r?\n\r?\n/);
      }
    }
    buffer += decoder.decode();
    const message = parseSseBlock(buffer);
    if (message) yield message;
  } finally {
    reader.releaseLock();
  }
}

function parseSseData(data: string): unknown {
  try { return JSON.parse(data); } catch { return data; }
}
```

---

## 10. World Cup Competition Coverage

The free tier (Service Level 1 and 12) covers **World Cup** and **International Friendlies**.

For the fixtures snapshot, filter by fixture metadata. The schedule doc shows all confirmed fixtures have:
- `Fixture Group` pattern: `World Cup > Group Stage`, `World Cup > Round of 32`, `World Cup > 8th Finals`, `World Cup > Quarter-finals`
- `Country: International`

[NEEDS-HUMAN-INPUT: Confirm the competitionId for the 2026 World Cup as it appears in the `/api/fixtures/snapshot` response. The schedule page does not list it explicitly.]

### Confirmed World Cup Fixture IDs (from TxLINE schedule page)

Useful for `record-match.ts` when capturing replay fixtures:

| fixtureId | Match | Date (UTC) | Stage |
|-----------|-------|------------|-------|
| 17588310 | Tunisia vs Japan | Jun 21 04:00 | Group |
| 17588232 | Spain vs Saudi Arabia | Jun 21 16:00 | Group |
| 17588389 | Argentina vs Austria | Jun 22 17:00 | Group |
| 17926647 | France vs Iraq | Jun 22 21:00 | Group |
| 17588231 | Portugal vs Uzbekistan | Jun 23 17:00 | Group |
| 17588324 | England vs Ghana | Jun 23 20:00 | Group |
| 17588325 | Jordan vs Argentina | Jun 28 02:00 | Group |
| 18172489 | Brazil vs Japan | Jun 29 17:00 | R32 |
| 18175981 | France vs Sweden | Jun 30 21:00 | R32 |
| 18185036 | Canada vs Morocco | Jul 4 17:00 | 8th Finals |
| 18188721 | Paraguay vs France | Jul 4 21:03 | 8th Finals |
| 18187298 | Brazil vs Norway | Jul 5 20:00 | 8th Finals |
| 18192996 | Mexico vs England | Jul 6 00:00 | 8th Finals |
| 18198205 | Portugal vs Spain | Jul 6 19:00 | 8th Finals |
| 18193785 | USA vs Belgium | Jul 7 00:00 | 8th Finals |
| 18202701 | Argentina vs Egypt | Jul 7 16:00 | 8th Finals |
| 18202783 | Switzerland vs Colombia | Jul 7 20:00 | 8th Finals |
| 18209181 | France vs Morocco | Jul 9 20:00 | QF |

Use `GET /api/scores/historical/${fixtureId}` for matches that ended > 6h ago for replay fixtures.

---

## 11. Odds De-margining (implement in adapter.ts)

Per Implementation Guide Section 5:

```typescript
// Raw decimal odds from TxLINE → implied probability → strip bookmaker margin
// p_raw = 1 / decimalOdds
// sum = p_raw_home + p_raw_draw + p_raw_away
// p_normalised = p_raw / sum   (so the three sum to exactly 1.0)

function toImpliedProbability(decimalOdds: number): number {
  return 1 / decimalOdds;
}

function normaliseProbabilities(home: number, draw: number, away: number): {
  pHome: number; pDraw: number; pAway: number;
} {
  const sum = home + draw + away;
  return { pHome: home / sum, pDraw: draw / sum, pAway: away / sum };
}
```

[NEEDS-HUMAN-INPUT: Confirm the decimal odds field names in the odds snapshot/stream response. We're assuming something like `OddsHome`, `OddsDraw`, `OddsAway` or `Odds1X2Home` etc. — paste a real response so we can bind the correct field names.]

---

## 12. env vars derived from this doc

Add to `.env.example` (already in Implementation Guide Section 2, confirming values here):

```bash
TXLINE_BASE_URL=https://txline-dev.txodds.com   # devnet
# TXLINE_BASE_URL=https://txline.txodds.com     # mainnet (not used in hackathon)
TXLINE_API_KEY=                                  # apiToken from /api/token/activate
# The guest JWT is short-lived; adapter must call /auth/guest/start at runtime.
# Do NOT store the JWT in env — generate it fresh per adapter session.
```

---

## 13. Open Questions (NEEDS-HUMAN-INPUT summary)

Items the adapter cannot be completed without:

1. **Real fixture snapshot response** — confirm field names, whether live score & status are included.
2. **Real odds snapshot/stream message** — confirm field names for home/draw/away decimal odds and fixtureId linkage.
3. **Real scores stream message** — confirm event structure: goals, cards, minute, team side, fixtureId.
4. **Match minute in scores feed** — is it a direct `minute` field or derived?
5. **World Cup competitionId** — value to filter `/api/fixtures/snapshot`.
6. **Guest JWT TTL** — does it expire? Does `adapter.ts` need a refresh loop?
7. **Devnet service level 12** — is real-time (SL-12) available on devnet or mainnet only?
8. **`interval` parameter** in `/api/odds/updates` and `/api/scores/updates` — valid values.

Until these are answered, `adapter.ts` internals remain stubs per the Implementation Guide rule:
> If you do not know an endpoint's exact path or response shape, do NOT guess it. Output [NEEDS-HUMAN-INPUT: ...] and stop.
