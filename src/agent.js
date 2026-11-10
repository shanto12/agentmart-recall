/**
 * AgentMart Recall — Smart Agents track entry for Tatum x Walrus "Total Recall".
 *
 * An AgentMart marketplace agent whose decisions are driven by persistent
 * memory stored on Walrus Memory, with on-chain context read through
 * Tatum's Sui GraphQL gateway.
 *
 * Flow:
 *   1. Read chain context via Tatum (checkpoint, wallet balance, recent txs).
 *   2. Store learned facts to Walrus Memory, namespace "agentmart"
 *      (rememberAndWait so each write is searchable before we rely on it).
 *   3. For each new marketplace scenario, recall relevant memories and let
 *      the recalled facts CHANGE the decision vs. a memory-less agent:
 *        - a low-trust counterparty is refused,
 *        - a remembered preferred category is prioritised,
 *        - a remembered price ceiling caps the counter-offer.
 *
 * Run:  npm install && cp .env.example .env && npm run demo
 * Without MEMWAL_* / TATUM_API_KEY values the demo runs fully offline
 * (MemWalMock + labelled Tatum mock data). With them, it runs live.
 */
import "dotenv/config";
import { createMemoryClient, NAMESPACE } from "./memory.js";
import { TatumSui } from "./tatum.js";
import { SEED_MEMORIES } from "./memories.js";

const SUI_ADDRESS =
  process.env.SUI_ADDRESS ||
  "0x9f1771097e059aa7e5c8b2a297d7bccee64d7ccddbf5fd8a1b0231982e79c664";

function line(char = "-") {
  console.log(char.repeat(72));
}

/** Extract a trust score "N out of 10" for a named counterparty from recalled text. */
function trustScoreFor(texts, name) {
  for (const t of texts) {
    if (t.toLowerCase().includes(name.toLowerCase())) {
      const m = t.match(/trust score of (\d+) out of 10/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

/** Extract a dollar price ceiling for an item keyword from recalled text. */
function priceCeilingFor(texts, keyword) {
  for (const t of texts) {
    const lower = t.toLowerCase();
    if (lower.includes(keyword.toLowerCase()) && lower.includes("price ceiling")) {
      const m = t.match(/price ceiling is (\d+) US dollars/i) || t.match(/ceiling is \$?([\d,]+)/i);
      if (m) return Number(String(m[1]).replace(/,/g, ""));
    }
  }
  return null;
}

async function main() {
  console.log("AgentMart Recall — persistent-memory marketplace agent");
  line("=");

  // ---- 1. On-chain context via Tatum (Sui GraphQL) ----------------------
  const tatum = new TatumSui({ apiKey: process.env.TATUM_API_KEY, address: SUI_ADDRESS });
  console.log("\n[1] Tatum Sui context");
  console.log(`    Wallet:          ${SUI_ADDRESS}`);
  console.log(`    Tatum account:   ${process.env.TATUM_ACCOUNT_ID || "6ada2d995f43a0f8387ba89a"}`);
  const checkpoint = await tatum.getCheckpoint();
  console.log(`    Checkpoint:      ${checkpoint.sequenceNumber}  [${checkpoint.mode}]`);
  const balance = await tatum.getBalance();
  const sui = Number(balance.totalBalance) / 1e9;
  console.log(`    SUI balance:     ${balance.totalBalance} MIST (${sui} SUI)  [${balance.mode}]`);
  const recent = await tatum.getRecentTransactions(5);
  console.log(`    Recent txs:      ${recent.transactions.length} shown  [${recent.mode}]`);
  for (const tx of recent.transactions) console.log(`      - ${tx.digest} (${tx.status})`);

  // ---- 2. Memory store via Walrus Memory --------------------------------
  const { client, mode } = createMemoryClient();
  console.log("\n[2] Walrus Memory");
  console.log(`    Mode:            ${mode}`);
  console.log(`    Namespace:       "${NAMESPACE}"`);
  try {
    const health = await client.health();
    console.log(`    Relayer health:  status=${health.status} version=${health.version}`);
  } catch (err) {
    console.log(`    Relayer health:  unavailable (${err.message}) — continuing`);
  }

  console.log(`\n    Storing ${SEED_MEMORIES.length} learned memories with rememberAndWait() ...`);
  for (const text of SEED_MEMORIES) {
    const result = await client.rememberAndWait(text, undefined, { timeoutMs: 30_000 });
    console.log(`      stored  blob_id=${result.blob_id ?? result.id ?? "n/a"}  ::  ${text.slice(0, 64)}...`);
  }

  // ---- 3. Recall-driven decisions ----------------------------------------
  console.log("\n[3] Decisions — memory-less baseline vs. AgentMart Recall");
  line();

  // Scenario A — low-trust counterparty
  {
    const seller = "Nova Resellers";
    const recall = await client.recall({
      query: `counterparty trust ${seller}`,
      topK: 5,
      maxDistance: 0.8,
    });
    const texts = recall.results.map((r) => r.text);
    const score = trustScoreFor(texts, seller);
    console.log(`\n  Scenario A: listing from ${seller} at an attractive price`);
    console.log(`    Recalled (${recall.total}): ${texts[0] ?? "none"}`);
    console.log(`    WITHOUT memory:  ACCEPT — price looks good, no history available.`);
    console.log(
      score !== null && score <= 3
        ? `    WITH memory:     REFUSE — recalled trust score is ${score}/10 with a recorded refusal to refund. Trade blocked.`
        : `    WITH memory:     PROCEED WITH CAUTION — recalled trust score: ${score ?? "unknown"}.`,
    );
  }

  // Scenario B — remembered category preference
  {
    const recall = await client.recall({
      query: "listing preference category refurbished laptops electronics",
      topK: 5,
      maxDistance: 0.8,
    });
    const texts = recall.results.map((r) => r.text);
    const prefersLaptops = texts.some((t) => /refurbished.*laptop|electronics category/i.test(t));
    console.log(`\n  Scenario B: two new listings — a refurbished ThinkPad and a sofa`);
    console.log(`    Recalled (${recall.total}): ${texts[0] ?? "none"}`);
    console.log(`    WITHOUT memory:  RANK EQUALLY — no preference signal.`);
    console.log(
      prefersLaptops
        ? `    WITH memory:     PRIORITISE the ThinkPad — recalled listing preference for refurbished laptops / electronics.`
        : `    WITH memory:     No strong category preference recalled.`,
    );
  }

  // Scenario C — remembered price ceiling in a negotiation
  {
    const ask = 650;
    const recall = await client.recall({
      query: "price ceiling iPhone negotiation outcome",
      topK: 5,
      maxDistance: 0.8,
    });
    const texts = recall.results.map((r) => r.text);
    const ceiling = priceCeilingFor(texts, "iPhone");
    console.log(`\n  Scenario C: seller asks $${ask} for a used iPhone`);
    console.log(`    Recalled (${recall.total}): ${texts[0] ?? "none"}`);
    console.log(`    WITHOUT memory:  ACCEPT at $${ask} — no ceiling on file.`);
    console.log(
      ceiling !== null
        ? `    WITH memory:     COUNTER at $${ceiling} — recalled price ceiling for a used iPhone is $${ceiling}; $${ask} exceeds it, so the agent negotiates instead of overpaying.`
        : `    WITH memory:     No price ceiling recalled — manual review.`,
    );
  }

  line("=");
  console.log("\nDemo complete: chain context from Tatum, memory on Walrus,");
  console.log("and three decisions that are demonstrably different because of recall.");
  if (typeof client.destroy === "function") client.destroy();
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
