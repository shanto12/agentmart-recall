#!/usr/bin/env node
/**
 * Seed adapter — reads the delegate key from the MemWal agent-login
 * credentials file (~/.memwal/credentials.json, written by memwal_login)
 * instead of env vars, then runs the normal seed flow.
 *
 * The private key is read in-process / passed to the child via env only.
 * It is NEVER printed, logged, or written to LIVE_EVIDENCE.md.
 *
 * Usage: node scripts/seed-from-credentials.js
 * Writes: ~/workspace/total-recall-agentmart/LIVE_EVIDENCE.md (blob IDs only — public)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const credsPath = process.env.MEMWAL_CREDS_PATH || join(homedir(), ".memwal", "credentials.json");

if (!existsSync(credsPath)) {
  console.error(`No credentials at ${credsPath} — complete memwal_login first (see memwal-login-pending.md).`);
  process.exit(1);
}
const creds = JSON.parse(readFileSync(credsPath, "utf8"));
if (!creds.delegatePrivateKey || !creds.accountId) {
  console.error("Credentials file is missing delegatePrivateKey/accountId.");
  process.exit(1);
}
console.log(`Using Walrus Memory account ${creds.accountId}, delegate ${creds.delegateAddress} (key not printed).`);

const env = {
  ...process.env,
  MEMWAL_PRIVATE_KEY: creds.delegatePrivateKey,
  MEMWAL_ACCOUNT_ID: creds.accountId,
  MEMWAL_SERVER_URL: creds.relayerUrl || "https://relayer.memory.walrus.xyz",
};

const run = spawnSync("node", [join(root, "scripts/seed-memories.js")], { env, encoding: "utf8" });
process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");
if (run.status !== 0) { console.error("Seed failed with status", run.status); process.exit(run.status ?? 1); }

const blobIds = [...(run.stdout || "").matchAll(/blob_id=([A-Za-z0-9_-]+)/g)].map((m) => m[1]).filter((b) => b !== "pending");
const evidence = [
  "# Live Walrus Memory evidence — AgentMart Recall (Total Recall hackathon)",
  "",
  `Seeded: ${new Date().toISOString()}`,
  `Walrus Memory account: ${creds.accountId}`,
  `Delegate address: ${creds.delegateAddress}`,
  `Wallet (account owner): ${creds.walletAddress}`,
  `Relayer: ${env.MEMWAL_SERVER_URL}`,
  `Namespace: agentmart`,
  `Memories written: ${blobIds.length}`,
  "",
  "## Blob IDs (public)",
  ...blobIds.map((b, i) => `${i + 1}. \`${b}\``),
  "",
  "## Full seed output",
  "```",
  (run.stdout || "").trim(),
  "```",
  "",
].join("\n");
writeFileSync(join(root, "LIVE_EVIDENCE.md"), evidence);
console.log(`\nWrote ${blobIds.length} blob IDs to LIVE_EVIDENCE.md`);
