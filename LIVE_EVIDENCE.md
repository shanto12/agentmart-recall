# LIVE EVIDENCE — Walrus Memory Mainnet (live, not mock)

Verified live on 2026-11-09/10 via the relayer-sponsored flow (zero gas paid by the
project wallet — the relayer sponsor paid for both on-chain transactions).
No browser was used; all signatures were made locally with the project wallet keypair.

## Identities

| Field | Value |
|---|---|
| Sui owner address (project wallet) | `0x9f1771097e059aa7e5c8b2a297d7bccee64d7ccddbf5fd8a1b0231982e79c664` |
| MEMWAL_ACCOUNT_ID (new Walrus Memory account) | `0x96c0f60a8adbc8a7cd6ca59a56418d4e01795c889a0578e18d2a5483cd6879c6` |
| MEMWAL_AGENT_ID (delegate public key, hex) | `cf79009654b179b73e2958653f3e15747db2fe5156d80f697ef98186427a6b23` |
| Delegate Sui address (derived) | `0x83cf7170b0e129da5edbe9ae5b4aeb2d8d673e8e5e916db5c7bb56c871a29505` |
| Delegate label on-chain | `AgentMart agent` |
| Relayer | `https://relayer.memory.walrus.xyz` |
| Package / Registry (Mainnet) | `0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5` / `0x8bf82c9e09e36b8d1c38298f68b7cb68e7b8762887e7592add9986d5e9cf199f` |
| Namespace | `agentmart` |

Delegate private key is stored ONLY in `~/workspace/total-recall-agentmart/.env`
(mode 600, `MEMWAL_PRIVATE_KEY`) — never printed or logged.

## Sponsored transactions (both succeeded on attempt 1)

| Step | Endpoint flow | Digest |
|---|---|---|
| `create_account` | `POST /sponsor` → owner signs sponsored tx bytes → `POST /sponsor/execute` | `G9T6Hknr5oHQ1W1pDcxje7jkUmDKTWvHrPE2D98mB24j` |
| `add_delegate_key` | same sponsored flow | `3XFus96D8DrEtKTdAWRsJqMAC43pjmRQSAPDVQchxFto` |

Sponsor authorization: personal-message signature via SDK `createSponsorAuthorization`
(message format `MemWal sponsor authorization / sender / transaction-kind-sha256 / timestamp / nonce`).
Relayer existence check after creation: `GET /api/accounts/<owner>/exists` → `{"exists":true}`.

## Memories seeded on Mainnet — 14/14 written and recall-verified

| # | Blob ID |
|---|---|
| 1 | `R3OhVqeinZttus_c4HELW353Io9qh4b_dLnjn3wAT1Q` |
| 2 | `F6hx_0WBH0QpJY5x0-fyQGM_i1Lt2bmeG08c59_qlEA` |
| 3 | `wVFgNMwCaI562XRLamjWfTcy8ayJmzeAZgt63xgqpB4` |
| 4 | `_Jxho_X1iYIUL_A_Ayfbom7Ixs7soxeUQlErRraw3mo` |
| 5 | `qbOBV3UWBu6CARYwfOXsnfHWsl-3VGZyimT_WwupphY` |
| 6 | `N2KNdYIBVq81SCGtZzfpUrmvPPL41m5ymlaqttZSO4c` |
| 7 | `f0xXZMN4Y6JH0TaDInyCCzq-0GdbvV95mNvlPsvLfog` |
| 8 | `20vDeSXFxO4X6utzfkbE_st2d5l3kiJKgiP_gPAjmAw` |
| 9 | `KB0fI1r6rsjpLuuAUW94d4mgS_WlGdcxNGPITcEPzwA` |
| 10 | `vPE8aM1rG_PdLHiamNhsw0ze-aVdvHWoE5EE9koEILA` |
| 11 | `uX8WWq_mwK3jivcdLd8eS_yBchdjtuDtkcNHfL9WYyw` |
| 12 | `zh8ixGRGTAzWLbqovsCCeiOTf3Zlb136HNzMdPh2of0` |
| 13 | `Cl3XgYFnS0WgYyhTqyNZcxmLtevS5AQUl5ZGtboC93I` |
| 14 | `i0NqrIHfAE02uTJqSkL7xME700dUM4VxWgRbQn3aiAE` |

Recall verification (live relayer, delegate-key auth):
- Query "counterparty trust price ceiling listing preference" (topK 10) → **10 results**, texts match the seeded memories (Nova Resellers, PixelVault, QuickFlip, Harbour Tech, price ceilings, listing preferences).
- Query "Nova Resellers trust score refusal" (topK 5) → **5 results**.

Note: the sandbox egress proxy intermittently closes TLS sockets (`UND_ERR_SOCKET`);
the seed was run with per-write retries and every memory was confirmed via
`waitForRememberJob` before moving on. Per-memory job/blob evidence also in
`scratch-sponsor/seed-evidence.json`.
