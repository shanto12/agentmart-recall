# AgentMart Recall

**Tatum x Walrus "Total Recall" hackathon — Smart Agents track**

An AgentMart marketplace agent that actually remembers. Every trade teaches
it something — which counterparties to trust, which categories the buyer
prefers, what price ceiling to hold in a negotiation — and that knowledge is
stored as persistent, encrypted memory on **Walrus Memory**. On-chain context
(checkpoint, wallet balance, recent transactions) is read through **Tatum's
Sui GraphQL API**. At decision time the agent recalls the relevant memories
and its decision demonstrably changes: it refuses a seller it learned not to
trust, prioritises a category it learned the buyer prefers, and counters at
a price ceiling it learned from a past negotiation instead of overpaying.

## What it does

1. **Reads the chain (Tatum).** Fetches the latest Sui checkpoint, the
   AgentMart wallet balance, and recent transactions for the wallet via
   Tatum GraphQL.
2. **Stores memory (Walrus Memory).** Writes learned facts — counterparty
   trust scores, listing preferences, price ceilings, negotiation
   outcomes — to Walrus Memory under the namespace `agentmart`, using
   `rememberAndWait()` so each fact is searchable before it is relied on.
3. **Recalls and decides.** For each new scenario it runs a semantic
   `recall()` and parses the returned facts into its decision:
   - trust score ≤ 3/10 → **refuse the trade**;
   - remembered preferred category → **prioritise that listing**;
   - remembered price ceiling → **counter at the ceiling**, never above it.
   Every scenario is printed twice — the memory-less baseline decision and
   the recall-driven decision — so the effect of memory is explicit.

## Architecture

```
src/agent.js          Demo entry point: Tatum context -> store -> recall -> decide
src/memory.js         Client factory: MemWal.create(...) live, MemWalMock fallback
src/tatum.js          TatumSui: GraphQL-only Sui reads (checkpoint / balance / txs)
src/memories.js       The 14 seed memories (single source of truth)
scripts/seed-memories.js   Writes all seed memories (npm run seed)
docs/tatum.md         Tatum GraphQL endpoints and queries
docs/walrus.md        Walrus Memory SDK calls and flows
```

Decision logic is intentionally simple and auditable: regular expressions
pull the trust score / dollar ceiling out of the recalled memory text, so
anyone can trace exactly which stored fact caused which decision.

## How Walrus Memory is used

- SDK: `@mysten-incubation/memwal` (`MemWal.create({ key, accountId, serverUrl, namespace })`).
- Relayer: `https://relayer.memory.walrus.xyz` — embedding, encryption,
  Walrus storage and vector search happen server-side in a TEE; the SDK
  signs requests with an Ed25519 delegate key.
- Calls: `health()`, `rememberAndWait()`, `remember()` +
  `waitForRememberJob()`, and `recall({ query, topK, maxDistance })`.
- Namespace: `agentmart`. 14 seed memories — above the 10+ memories bar.
- Fallback: when `MEMWAL_PRIVATE_KEY` / `MEMWAL_ACCOUNT_ID` are unset the
  factory swaps in the SDK's own `MemWalMock` (same API, fully local) so
  the demo runs offline. Real mode is the default when the env vars exist.

## How Tatum is used

- GraphQL only: `POST https://sui-mainnet.gateway.tatum.io/graphql` with
  an `x-api-key` header. (Tatum's Sui JSON-RPC endpoint returns 404 —
  GraphQL is the supported route; see `docs/tatum.md`.)
- Queries: latest checkpoint `sequenceNumber`, wallet `balance`, and
  recent `transactions` filtered by the AgentMart Sui address.
- Without `TATUM_API_KEY`, the client returns clearly labelled mock data
  so the demo still runs end to end offline.

## Run it

```bash
npm install
cp .env.example .env   # fill in MEMWAL_* and TATUM_API_KEY for live mode
npm run demo           # full flow: chain context, store, recall, decisions
npm run seed           # write all 14 seed memories and probe recall
```

Offline (no keys in `.env`): the demo runs against `MemWalMock` and
labelled Tatum mock data — see `DEMO_OUTPUT.txt` for a captured run.

## Identifiers

- Tatum account ID: `6ada2d995f43a0f8387ba89a`
- Sui address (project wallet): `0x9f1771097e059aa7e5c8b2a297d7bccee64d7ccddbf5fd8a1b0231982e79c664`
- Walrus Memory account ID (`MEMWAL_ACCOUNT_ID`): `0xf7563b32f9977e5cf722d4bbbb17e992fd84df045b66975608f60feadd165b81`
- Walrus Memory agent/delegate ID (`MEMWAL_AGENT_ID`, delegate public key): `6201c0e3a906b722607cc851957252de8348bb7edb4c46a739e803e653162312`
- Walrus Memory account owner (zkLogin wallet): `0x2084e76dd94caeded3a8695b719423acf172cdbab48449fda2ab0100f6071316`
- Relayer: `https://relayer.memory.walrus.xyz`

## Evidence

- Demo output (offline mock mode): `DEMO_OUTPUT.txt`
- Live seed run (blob IDs for 10+ Mainnet memories): _placeholder — paste `npm run seed` output after configuring real delegate keys_
- Demo video: _placeholder — link to be added on submission_
- Blog post: `blog-post.md` (draft in this repo)

## License

Apache-2.0
