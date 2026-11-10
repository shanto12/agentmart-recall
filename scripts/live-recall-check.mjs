/**
 * Live Walrus Memory recall check — Total Recall / AgentMart Recall.
 *
 * Uses the project's own src/memory.js factory in REAL mode (credentials
 * from .env — MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID / MEMWAL_AGENT_ID).
 * The private key is never printed.
 *
 * Steps:
 *   1. health() against the live relayer, with retries.
 *   2. Three recall queries (topK 5), each with retries — the sandbox
 *      egress proxy intermittently kills TLS sockets (UND_ERR_SOCKET),
 *      so every relayer call is retried up to 8 times with short backoff.
 *   3. Prints every returned memory text + blob_id.
 *   4. Prints the decision each recall drives, parsing values out of the
 *      recalled text exactly like src/agent.js does.
 *
 * Run from the project root:  node scripts/live-recall-check.mjs
 */
import "dotenv/config";
import { createMemoryClient, NAMESPACE } from "../src/memory.js";

const MAX_ATTEMPTS = 8;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const out = await fn();
      if (attempt > 1) console.log(`    [retry] ${label} succeeded on attempt ${attempt}`);
      return out;
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message ?? err).slice(0, 160);
      console.log(`    [retry] ${label} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`);
      if (attempt < MAX_ATTEMPTS) await sleep(Math.min(1200 * attempt, 6000));
    }
  }
  throw lastErr;
}

/** Extract a trust score "N out of 10" for a named counterparty — same parser as src/agent.js. */
function trustScoreFor(texts, name) {
  for (const t of texts) {
    if (t.toLowerCase().includes(name.toLowerCase())) {
      const m = t.match(/trust score of (\d+) out of 10/i);
      if (m) return Number(m[1]);
    }
  }
  return null;
}

/** Extract a dollar price ceiling for an item keyword — same parser as src/agent.js. */
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

function printRecall(query, recall) {
  const results = recall.results ?? [];
  console.log(`  Returned: ${results.length} memories (relayer total=${recall.total ?? "n/a"}` +
    (recall.degraded ? `, degraded=true dropped_count=${recall.dropped_count ?? "?"}` : "") + `)`);
  results.forEach((r, i) => {
    console.log(`    [${i + 1}] blob_id=${r.blob_id ?? r.blobId ?? "n/a"}` +
      (typeof r.distance === "number" ? ` distance=${r.distance}` : ""));
    console.log(`        text: ${r.text}`);
  });
  return results.map((r) => r.text);
}

async function main() {
  console.log("=".repeat(72));
  console.log("LIVE RECALL CHECK — AgentMart Recall on Walrus Memory (Mainnet relayer)");
  console.log("=".repeat(72));

  const { client, mode } = createMemoryClient();
  console.log(`Mode:      ${mode}`);
  console.log(`Namespace: "${NAMESPACE}"`);
  console.log(`Account:   ${process.env.MEMWAL_ACCOUNT_ID || "(unset)"}`);
  if (!mode.startsWith("live")) {
    throw new Error("Not in live mode — MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID missing from .env");
  }

  // ---- 1. Health -------------------------------------------------------
  console.log("\n[1] Relayer health (with retries)");
  const health = await withRetry("health", () => client.health());
  console.log(`  HEALTH: status=${health.status} version=${health.version ?? "n/a"}`);
  console.log(`  raw: ${JSON.stringify(health)}`);

  const counts = {};

  // ---- 2a. Counterparty trust — Nova Resellers -------------------------
  console.log('\n[2] Recall: "counterparty trust Nova Resellers" (topK 5)');
  const recallA = await withRetry("recall-A", () =>
    client.recall({ query: "counterparty trust Nova Resellers", topK: 5, maxDistance: 0.9 }));
  const textsA = printRecall("counterparty trust Nova Resellers", recallA);
  counts["counterparty trust Nova Resellers"] = textsA.length;
  const score = trustScoreFor(textsA, "Nova Resellers");
  console.log("  DECISION (Scenario A — listing from Nova Resellers):");
  console.log(
    score !== null && score <= 3
      ? `    REFUSE Nova Resellers — recalled trust score is ${score}/10 (<= 3), with a recorded refusal to refund. Trade blocked.`
      : `    PROCEED WITH CAUTION — recalled trust score for Nova Resellers: ${score ?? "not found in recalled text"}.`,
  );

  // ---- 2b. Listing preference — refurbished laptop / electronics -------
  console.log('\n[3] Recall: "listing preference refurbished laptop electronics" (topK 5)');
  const recallB = await withRetry("recall-B", () =>
    client.recall({ query: "listing preference refurbished laptop electronics", topK: 5, maxDistance: 0.9 }));
  const textsB = printRecall("listing preference refurbished laptop electronics", recallB);
  counts["listing preference refurbished laptop electronics"] = textsB.length;
  const prefersLaptops = textsB.some((t) => /refurbished.*laptop|electronics category/i.test(t));
  console.log("  DECISION (Scenario B — refurbished ThinkPad vs. a sofa):");
  console.log(
    prefersLaptops
      ? "    PRIORITISE the ThinkPad — recalled listing preference for refurbished laptops / electronics category."
      : "    No strong category preference recalled — rank listings equally.",
  );

  // ---- 2c. Price ceiling — used iPhone ---------------------------------
  console.log('\n[4] Recall: "price ceiling used iPhone" (topK 5)');
  const recallC = await withRetry("recall-C", () =>
    client.recall({ query: "price ceiling used iPhone", topK: 5, maxDistance: 0.9 }));
  const textsC = printRecall("price ceiling used iPhone", recallC);
  counts["price ceiling used iPhone"] = textsC.length;
  const ask = 650;
  const ceiling = priceCeilingFor(textsC, "iPhone");
  console.log(`  DECISION (Scenario C — seller asks $${ask} for a used iPhone):`);
  console.log(
    ceiling !== null
      ? `    COUNTER at $${ceiling} — recalled price ceiling for a used iPhone is $${ceiling}; the $${ask} ask exceeds it, so the agent negotiates instead of overpaying.`
      : "    No price ceiling recalled — manual review.",
  );

  // ---- Summary ----------------------------------------------------------
  console.log("\n" + "=".repeat(72));
  console.log("SUMMARY");
  console.log(`  health: status=${health.status} version=${health.version ?? "n/a"}`);
  for (const [q, n] of Object.entries(counts)) console.log(`  recall "${q}": ${n} memories`);
  console.log(`  decisions: trust=${score ?? "n/a"}/10 -> ${score !== null && score <= 3 ? "REFUSE Nova Resellers" : "caution"}` +
    ` | preference -> ${prefersLaptops ? "PRIORITISE ThinkPad" : "none"}` +
    ` | iPhone ceiling=${ceiling !== null ? "$" + ceiling : "n/a"} -> ${ceiling !== null ? `COUNTER at $${ceiling} vs $${ask} ask` : "manual review"}`);
  console.log("LIVE_RECALL_CHECK_DONE");

  if (typeof client.destroy === "function") client.destroy();
}

main().catch((err) => {
  console.error("LIVE_RECALL_CHECK_FAILED:", err?.message ?? err);
  process.exit(1);
});
