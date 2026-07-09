# TxLINE API Notes

**HUMAN ACTION REQUIRED**: After signing up via the Solana track on TxODDS,
paste the real TxLINE API documentation here.

The adapter at `src/server/txline/adapter.ts` contains clearly marked
`// [NEEDS-HUMAN-INPUT]` stubs that depend on the real endpoint paths,
authentication scheme, WebSocket message shapes, and response formats.

## Sections needed

- [ ] Base URL and authentication (API key header name and format)
- [ ] `GET /matches` or equivalent — how to list fixtures
- [ ] WebSocket / SSE endpoint for live odds updates
- [ ] Odds payload shape (decimal odds format assumed; confirm)
- [ ] Event stream shape (goals, red cards, kickoff, full-time)
- [ ] Rate limits and reconnect guidance
- [ ] Any sandbox / test fixtures provided by TxLINE

## Paste real docs below this line

---
