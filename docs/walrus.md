# Walrus Memory — flows used by AgentMart Recall

AgentMart Recall stores every learned marketplace fact in **Walrus Memory**
via the official TypeScript SDK, and recalls those facts at decision time.

## SDK

- Package: `@mysten-incubation/memwal` — version `^0.1.14`
  (verified on npm and against the published package's type definitions
  during the build).
- Docs / dashboard: https://memory.walrus.xyz and
  https://memory.walrus.xyz/dashboard
- Relayer: `https://relayer.memory.walrus.xyz` — the SDK's default
  `serverUrl`. All embedding, encryption, Walrus upload and vector search
  happen server-side in the relayer's TEE; the SDK only signs requests
  with the Ed25519 delegate key and sends plaintext over HTTPS.

## Client setup (real mode)

```js
import { MemWal } from "@mysten-incubation/memwal";

const memwal = MemWal.create({
  key: process.env.MEMWAL_PRIVATE_KEY,      // Ed25519 delegate key (hex or suiprivkey1...)
  accountId: process.env.MEMWAL_ACCOUNT_ID, // Walrus Memory account object ID on Sui
  serverUrl: "https://relayer.memory.walrus.xyz",
  namespace: "agentmart",
});
```

Real mode is the default whenever `MEMWAL_PRIVATE_KEY` and
`MEMWAL_ACCOUNT_ID` are present. The delegate key is created in the
Walrus Memory dashboard (Account → delegate keys); the resulting
delegate/agent ID is `MEMWAL_AGENT_ID` in `.env.example` and is a
required field on the Total Recall submission form.

## Calls used

| Call | Where | Purpose |
| --- | --- | --- |
| `MemWal.create({ key, accountId, serverUrl, namespace })` | `src/memory.js` | Build the signed client for namespace `agentmart`. |
| `client.health()` | `src/agent.js` | Relayer health/version check before writing. Returns `{ status, version, ... }`. |
| `client.rememberAndWait(text, undefined, { timeoutMs: 30_000 })` | `src/agent.js` demo | Store one memory and wait until it is searchable; returns `{ blob_id, owner, namespace, ... }`. |
| `client.remember(text)` + `client.waitForRememberJob(job_id)` | `scripts/seed-memories.js` | Async store, then explicit job polling — the two-step form of the same write. `remember()` returns an accepted background job (`job_id`); `waitForRememberJob` resolves with the final `blob_id`. |
| `client.recall({ query, topK, maxDistance })` | both | Semantic search over namespace `agentmart`. Returns `{ results: [{ blob_id, text, distance, created_at }], total }`. We use `topK: 5`, `maxDistance: 0.8`. |
| `MemWalMock.create({ namespace })` | `src/memory.js` (fallback only) | The SDK's own in-memory implementation — identical async API, deterministic token-overlap ranking, no network. Used only when the `MEMWAL_*` env vars are unset, so `npm run demo` works offline. |

## Memory model

- One namespace: `agentmart`.
- One memory = one self-contained learned fact (counterparty trust,
  listing preference, price ceiling, negotiation outcome).
- 14 seed memories are defined in `src/memories.js` and written by
  `npm run seed` — above the hackathon's 10+ memories-on-Mainnet bar
  once real delegate keys are configured.
- Recall is not decoration: the agent parses the recalled text
  (trust scores, dollar ceilings, category preferences) and those values
  directly gate the decision logic in `src/agent.js`.
