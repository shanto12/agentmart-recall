# AgentMart Recall — Demo Video Script (2–3 minutes)

**Project:** AgentMart Recall — Tatum x Walrus "Total Recall" hackathon, Smart Agents track
**Video:** `demo-video.mp4` — 1920×1080, narrated

> Honesty note (shown on screen): The captured demo run in `DEMO_OUTPUT.txt` was in the SDK's local mock mode (credentials-gated). The same code runs live on Mainnet with delegate credentials; this capture uses the SDK's local mock so it can be replayed offline.

## Narration

**[0:00 — Title]**
AgentMart Recall. A marketplace agent that remembers. This is our entry for the Tatum and Walrus Total Recall hackathon, Smart Agents track.

**[0:15 — Problem]**
Most agents are goldfish. Every session starts from zero. They cannot remember which seller burned them, what the buyer actually prefers, or what price they promised never to exceed. So they repeat the same mistakes, trade after trade.

**[0:40 — How it works]**
AgentMart Recall fixes that with two live systems. Tatum's Sui GraphQL API gives the agent on-chain context: the latest checkpoint, wallet balance, and recent transactions. Walrus Memory gives it persistent, encrypted memory. Through the Walrus relayer, under the namespace agentmart, the agent stores trust scores, listing preferences, and price ceilings — and recalls them semantically at decision time.

**[1:05 — Memory store]**
In the demo, the agent stores fourteen learned memories. Counterparty trust. Buyer preferences. Price ceilings. Negotiation outcomes. Each one is written with rememberAndWait, so it is searchable before the agent ever relies on it.

**[1:25 — Decision A: REFUSE]**
Decision one. A listing from Nova Resellers, at an attractive price. Without memory, the agent accepts. With memory, it recalls a trust score of two out of ten — a misdescribed item, and a refused refund — and it refuses the trade.

**[1:50 — Decision B: PRIORITISE]**
Decision two. Two listings: a refurbished ThinkPad, and a sofa. Without memory, they rank equally. With memory, the agent recalls the buyer prefers refurbished laptops and electronics — and it prioritises the ThinkPad.

**[2:08 — Decision C: COUNTER]**
Decision three. A seller asks six hundred and fifty dollars for a used iPhone. Without memory, the agent accepts and overpays. With memory, it recalls a five-hundred-dollar ceiling — and counters at five hundred dollars.

**[2:28 — Evidence, run it, close]**
Everything is verifiable. Tatum account, Sui address, Walrus Memory account, and delegate ID are on screen now, and in the README. Run it yourself with npm install, npm run demo, and npm run seed. Memory turns a stateless agent into a colleague. That is AgentMart Recall. Thank you.

## On-screen identifiers

- Tatum account: `6ada2d995f43a0f8387ba89a`
- Sui address: `0x9f1771097e059aa7e5c8b2a297d7bccee64d7ccddbf5fd8a1b0231982e79c664`
- Walrus Memory account: `0xf7563b32f9977e5cf722d4bbbb17e992fd84df045b66975608f60feadd165b81`
- MEMWAL_AGENT_ID: `6201c0e3a906b722607cc851957252de8348bb7edb4c46a739e803e653162312`
- Relayer: `https://relayer.memory.walrus.xyz`
- Namespace: `agentmart`
