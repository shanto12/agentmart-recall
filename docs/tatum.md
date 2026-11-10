# Tatum — Sui reads used by AgentMart Recall

All Sui data in this project comes from **Tatum's Sui GraphQL gateway**.
There is no JSON-RPC usage anywhere in the codebase.

## Why GraphQL only

During the build we verified that Tatum's Sui **JSON-RPC endpoint returns
404**. The supported route is the GraphQL gateway:

```
POST https://sui-mainnet.gateway.tatum.io/graphql
Header: x-api-key: <TATUM_API_KEY>
Content-Type: application/json
Body: { "query": "...", "variables": { ... } }
```

Implementation: `src/tatum.js` (`TatumSui.graphql()`), using the Node.js
global `fetch` — no extra HTTP dependency.

## Queries used

### 1. Latest checkpoint

```graphql
query { checkpoint { sequenceNumber digest timestamp } }
```

Used at startup so the demo proves it is reading live mainnet state and
can anchor "what the chain looked like when this decision was made".

### 2. Wallet balance

```graphql
query($address: SuiAddress!) {
  address(address: $address) {
    balance(coinType: "0x2::sui::SUI") { totalBalance coinType }
  }
}
```

Variables: `address = 0x9f1771097e059aa7e5c8b2a297d7bccee64d7ccddbf5fd8a1b0231982e79c664`
(the AgentMart wallet). `totalBalance` is returned in MIST and converted
to SUI in the demo output.

### 3. Recent transactions for the wallet

```graphql
query($address: SuiAddress!, $first: Int!) {
  transactions(first: $first, filter: { affectedAddress: $address }) {
    nodes { digest effects { status } }
  }
}
```

Used to show the wallet's recent on-chain activity alongside the
memory-driven decision log.

## Account

- Tatum account ID: `6ada2d995f43a0f8387ba89a` (free plan)
- The API key itself lives only in `.env` (`TATUM_API_KEY`) and is never
  committed. See `.env.example`.

## Offline behaviour

With no `TATUM_API_KEY` set, `src/tatum.js` returns clearly labelled mock
values (`mode: "mock (no TATUM_API_KEY)"` in the demo output) so the full
agent flow can be rehearsed offline. With a key set, the same code paths
run live against the GraphQL gateway — no code change required.
