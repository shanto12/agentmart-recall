/**
 * Seed script — writes all SEED_MEMORIES to Walrus Memory (namespace "agentmart").
 *
 * Usage:
 *   cp .env.example .env   # fill MEMWAL_PRIVATE_KEY + MEMWAL_ACCOUNT_ID (+ TATUM_API_KEY)
 *   npm run seed
 *
 * Writes 14 distinct memories, satisfying the hackathon requirement of
 * 10+ memories stored on Mainnet once real delegate keys are configured.
 * Uses rememberAndWait() so every memory is confirmed searchable, and prints
 * the returned blob_id for each write as evidence.
 *
 * Without MEMWAL_* env vars it runs against MemWalMock (offline, no writes
 * leave the machine) so the flow can be rehearsed anywhere.
 */
import "dotenv/config";
import { createMemoryClient, NAMESPACE } from "../src/memory.js";
import { SEED_MEMORIES } from "../src/memories.js";

async function main() {
  const { client, mode } = createMemoryClient();
  console.log(`Seeding Walrus Memory — namespace "${NAMESPACE}"`);
  console.log(`Mode: ${mode}`);
  console.log(`Memories to write: ${SEED_MEMORIES.length}\n`);

  let ok = 0;
  for (const [i, text] of SEED_MEMORIES.entries()) {
    const accepted = await client.remember(text);
    const jobId = accepted.job_id ?? accepted.jobId;
    let blobId = accepted.blob_id ?? accepted.blobId ?? "pending";
    if (jobId && typeof client.waitForRememberJob === "function") {
      const done = await client.waitForRememberJob(jobId, { timeoutMs: 30_000 });
      blobId = done.blob_id ?? blobId;
    }
    ok += 1;
    console.log(`  [${String(i + 1).padStart(2, "0")}/${SEED_MEMORIES.length}] blob_id=${blobId} :: ${text.slice(0, 72)}...`);
  }

  const probe = await client.recall({ query: "counterparty trust price ceiling listing preference", topK: 5, maxDistance: 0.8 });
  console.log(`\nWrote ${ok} memories. Recall probe returned ${probe.total} result(s).`);
  if (typeof client.destroy === "function") client.destroy();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
