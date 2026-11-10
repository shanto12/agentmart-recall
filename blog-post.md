# AgentMart Recall: A Marketplace Agent That Actually Remembers

*Our submission to the Tatum x Walrus "Total Recall" hackathon — Smart Agents track.*

Most marketplace agents are goldfish. They evaluate every listing from scratch, with no memory of the seller who burned them last month, no recollection of what the buyer actually likes, and no record of the price they swore they would never exceed again. Humans do not trade like that. A human remembers that one seller who described a scratched phone as "mint" and refused the refund. AgentMart Recall gives an agent that same kind of memory — persistent, portable, and verifiable — using Walrus Memory for storage and recall, and Tatum's Sui APIs for on-chain context.

## What AgentMart Recall does

AgentMart is a marketplace agent that evaluates listings and negotiates on a buyer's behalf. The Recall build adds a memory layer with a simple loop: act, learn, store, recall, act differently. Every meaningful interaction becomes a single, self-contained memory: a counterparty trust score with the reason behind it, a listing preference, a price ceiling, or the outcome of a negotiation. Those memories live on Walrus Memory under one namespace, `agentmart`. When a new scenario arrives, the agent does not just pattern-match the listing in front of it — it first recalls what it knows about that seller, that category, and that kind of price, and lets the recalled facts drive the decision.

To make the effect impossible to miss, the demo prints every decision twice: once as a memory-less baseline agent would decide it, and once as AgentMart Recall decides it with memory loaded. The gap between those two lines is the entire point of the project.

## How it uses Walrus Memory

We built on the official TypeScript SDK, `@mysten-incubation/memwal`. The client is created with `MemWal.create({ key, accountId, serverUrl, namespace })`, pointing at the Walrus Memory relayer at `https://relayer.memory.walrus.xyz`. The relayer handles embedding, encryption, Walrus upload, and vector search inside a TEE; our code only signs requests with an Ed25519 delegate key and sends text. Writes use `rememberAndWait()` in the demo, so a fact is confirmed searchable before the agent relies on it, and the seed script uses the two-step form — `remember()` to accept the background job, then `waitForRememberJob()` to resolve the final blob ID. Reads use `recall({ query, topK, maxDistance })`, and a `health()` call checks the relayer before anything is written.

We seeded fourteen distinct memories — counterparty trust records for four sellers, category and warranty preferences, price ceilings for phones, laptops, and headphones, and negotiation outcomes, both good and bad. That is comfortably past the ten-memory bar, and the wording of each memory is deliberate: facts carry the keywords a future query will use, and the decision layer pulls structured values (a trust score out of ten, a dollar ceiling) straight out of the recalled text, so anyone can audit exactly which stored fact caused which decision.

For development and CI, the SDK ships `MemWalMock`, an in-memory implementation with the same async API. Our client factory uses real Walrus Memory whenever the delegate credentials are present, and only falls back to the mock when they are absent — which is how the demo runs offline while the production path stays the default.

## How it uses Tatum

All on-chain context comes from Tatum's Sui GraphQL gateway: `POST https://sui-mainnet.gateway.tatum.io/graphql` with an `x-api-key` header. At startup the agent fetches the latest checkpoint sequence number, the AgentMart wallet's SUI balance, and the wallet's recent transactions. That context anchors each decision run to a verifiable chain state — the demo output shows the checkpoint and wallet alongside the memory operations, which is exactly the evidence trail you would want if an agent's trade were ever disputed. One integration lesson cost us real time: Tatum's Sui JSON-RPC endpoint returns a plain 404. GraphQL is the supported route, and once we switched, every query worked first try.

## How it learned over time: a concrete before and after

Consider a seller we call Nova Resellers. In an early trade, Nova shipped a misdescribed item and refused the refund. The agent stored that as a memory: a trust score of 2 out of 10, with the reason attached and an explicit decision rule — refuse future trades. Weeks later, Nova lists an attractively priced phone. The memory-less baseline agent accepts instantly; the price is good and it knows nothing else. AgentMart Recall runs `recall({ query: "counterparty trust Nova Resellers" })`, retrieves the 2-out-of-10 record, and refuses the trade outright. The same learning shows up in negotiation: a seller asks $650 for a used iPhone, the baseline agent accepts, and Recall counters at exactly $500 — the ceiling stored from an earlier, cheaper purchase — instead of overpaying. And in ranking, a refurbished ThinkPad jumps ahead of a sofa purely because a stored preference says the buyer favours refurbished business laptops. None of these behaviours were programmed as rules about Nova, iPhones, or ThinkPads. They are all consequences of memories the agent wrote for itself.

## Friction we hit

Three things slowed us down. First, the JSON-RPC 404 above: nothing in the error suggested GraphQL was the answer. Second, delegate-key setup: the dashboard's first delegate key is shown exactly once, and the agent-login (MCP) flow posts its callback to a localhost bridge, which only works when the browser and the agent run on the same machine. The route that finally worked end to end was the relayer-sponsored flow the SDK itself exposes: build the `create_account` and `add_delegate_key` transaction kinds, get a sponsor authorization via a personal-message signature, let the relayer sponsor the gas, and sign the sponsored bytes locally with the project wallet. Zero gas spent, no browser in the loop — the account, its delegate key, and all fourteen seeded memories in this post are live on Mainnet, and the transaction digests and blob IDs are in the repo's `LIVE_EVIDENCE.md`. Third, recall quality depends on phrasing: early drafts written as terse notes retrieved poorly, and rewriting each memory as a complete sentence with explicit keywords made recall noticeably more reliable in both live semantic search and the mock's token-overlap ranking.

## Where this goes next

A memory layer turns an agent from a stateless function into a colleague: it accumulates judgement. Next steps are writing memories automatically from real trade receipts instead of seed data, adding expiry so a rehabilitated seller can earn trust back, and gating on-chain settlement through Tatum on the same recalled trust scores. The goldfish era should end. Ours, at least, remembers.
