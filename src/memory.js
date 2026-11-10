/**
 * Memory client factory — real Walrus Memory by default, local mock fallback.
 *
 * Real mode (default when env vars are present):
 *   MemWal.create({ key, accountId, serverUrl, namespace })
 *   from @mysten-incubation/memwal (v0.1.14, verified against npm).
 *   - key:       MEMWAL_PRIVATE_KEY — Ed25519 delegate key (hex / suiprivkey1...)
 *   - accountId: MEMWAL_ACCOUNT_ID  — Walrus Memory account object ID on Sui
 *   - serverUrl: https://relayer.memory.walrus.xyz (the Walrus Memory relayer)
 *   - namespace: "agentmart"
 *
 * Fallback mode (only when MEMWAL_PRIVATE_KEY / MEMWAL_ACCOUNT_ID are unset):
 *   MemWalMock.create({ namespace }) — the SDK's own in-memory implementation.
 *   Same async API surface (remember / rememberAndWait / recall / health),
 *   no network, no keys — so `npm run demo` runs anywhere, offline.
 */
import { MemWal, MemWalMock } from "@mysten-incubation/memwal";

export const NAMESPACE = "agentmart";
export const RELAYER_URL = "https://relayer.memory.walrus.xyz";

export function createMemoryClient(env = process.env) {
  const key = env.MEMWAL_PRIVATE_KEY;
  const accountId = env.MEMWAL_ACCOUNT_ID;

  if (key && accountId) {
    const client = MemWal.create({
      key,
      accountId,
      serverUrl: env.MEMWAL_SERVER_URL || RELAYER_URL,
      namespace: NAMESPACE,
    });
    return { client, mode: "live Walrus Memory (relayer: " + (env.MEMWAL_SERVER_URL || RELAYER_URL) + ")" };
  }

  const client = MemWalMock.create({ namespace: NAMESPACE });
  return {
    client,
    mode: "LOCAL MOCK (MemWalMock) — MEMWAL_PRIVATE_KEY/MEMWAL_ACCOUNT_ID not set; no data left this machine",
  };
}
