import "dotenv/config";
import fs from "node:fs";
import { createMemoryClient, NAMESPACE } from "../src/memory.js";
import { SEED_MEMORIES } from "../src/memories.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function withRetry(label, fn, tries = 5) {
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; console.log(`  ${label} attempt ${i} failed: ${String(e?.message ?? e).slice(0,120)}`); await sleep(2500 * i); }
  }
  throw last;
}

const { client, mode } = createMemoryClient();
console.log("Mode:", mode, "namespace:", NAMESPACE, "count:", SEED_MEMORIES.length);
const evidence = [];
for (const [i, text] of SEED_MEMORIES.entries()) {
  const accepted = await withRetry(`remember[${i+1}]`, () => client.remember(text));
  const jobId = accepted.job_id ?? accepted.jobId;
  let blobId = accepted.blob_id ?? accepted.blobId ?? "pending";
  if (jobId && typeof client.waitForRememberJob === "function") {
    const done = await withRetry(`wait[${i+1}]`, () => client.waitForRememberJob(jobId, { timeoutMs: 60_000 }));
    blobId = done.blob_id ?? done.blobId ?? blobId;
  }
  evidence.push({ n: i + 1, blob_id: blobId, job_id: jobId ?? null, text: text.slice(0, 80) });
  console.log(`[${String(i+1).padStart(2,"0")}/${SEED_MEMORIES.length}] blob_id=${blobId}`);
  fs.writeFileSync(new URL("./seed-evidence.json", import.meta.url), JSON.stringify(evidence, null, 2));
}
const probe = await withRetry("recall-probe", () => client.recall({ query: "counterparty trust price ceiling listing preference", topK: 10, maxDistance: 0.9 }));
console.log("RECALL_PROBE_TOTAL:", probe.total);
const probe2 = await withRetry("recall-probe2", () => client.recall({ query: "Nova Resellers trust score refusal", topK: 5, maxDistance: 0.9 }));
console.log("RECALL_PROBE2_TOTAL:", probe2.total);
for (const r of (probe.results ?? [])) console.log(" probe hit:", JSON.stringify(r).slice(0, 220));
if (typeof client.destroy === "function") client.destroy();
console.log("SEED_DONE", evidence.length);
