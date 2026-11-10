/**
 * Sponsored Walrus Memory account setup for the project Sui wallet.
 * Reads owner key from ~/workspace/wallets/keys.json in-process ONLY.
 * Never prints/logs any private key. Delegate private key is written
 * only to ../.env (mode 600).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PACKAGE_ID = "0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5";
const REGISTRY_ID = "0x8bf82c9e09e36b8d1c38298f68b7cb68e7b8762887e7592add9986d5e9cf199f";
const RELAYER = "https://relayer.memory.walrus.xyz";
const EXPECTED = "0x9f1771097e059aa7e5c8b2a297d7bccee64d7ccddbf5fd8a1b0231982e79c664";
const CLOCK = "0x0000000000000000000000000000000000000000000000000000000000000006";
const STATE_FILE = path.join(HERE, "state.json");

function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch { return {}; } }
function saveState(s) { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

const keys = JSON.parse(fs.readFileSync(path.join(process.env.HOME, "workspace/wallets/keys.json"), "utf8"));
const hex = keys?.sui?.private_key_hex;
if (!hex) { console.error("FATAL: sui.private_key_hex missing"); process.exit(1); }

const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
const { Transaction } = await import("@mysten/sui/transactions");
const { SuiGrpcClient } = await import("@mysten/sui/grpc");
const { createSponsorAuthorization } = await import("@mysten-incubation/memwal");
const { generateDelegateKey } = await import("@mysten-incubation/memwal/account");

const raw = Buffer.from(hex, "hex");
const seed = raw.length === 64 ? raw.subarray(0, 32) : raw;
const keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(seed));
const sender = keypair.getPublicKey().toSuiAddress();
console.log("Derived address:", sender);
if (sender !== EXPECTED) { console.error("FATAL: address mismatch"); process.exit(1); }
console.log("Address assertion OK. bech32 bridge OK (in-memory only).");

const client = new SuiGrpcClient({ network: "mainnet", baseUrl: "https://fullnode.mainnet.sui.io:443" });

async function postJson(url, body) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const text = await res.text();
    console.log(`POST ${url} attempt=${attempt} status=${res.status} body=${text.slice(0, 1200)}`);
    if (res.ok) { try { return JSON.parse(text); } catch { return { raw: text }; } }
    lastErr = new Error(`HTTP ${res.status}: ${text}`);
    lastErr.status = res.status; lastErr.body = text; lastErr.url = url; lastErr.requestBody = body;
    if (![408, 429, 500, 502, 503, 504].includes(res.status)) throw lastErr;
    await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  throw lastErr;
}

async function sponsored(tx, label) {
  tx.setSender(sender);
  const kindBytes = await tx.build({ client, onlyTransactionKind: true });
  console.log(`${label}: kindBytes length=${kindBytes.length}`);
  const auth = await createSponsorAuthorization(sender, kindBytes, (msg) => keypair.signPersonalMessage(msg));
  const sponsorBody = {
    transactionBlockKindBytes: Buffer.from(kindBytes).toString("base64"),
    sender,
    authNonce: auth.authNonce,
    authSignature: auth.authSignature,
    authTimestamp: auth.authTimestamp,
  };
  const sponsoredRes = await postJson(`${RELAYER}/sponsor`, sponsorBody);
  const b64 = sponsoredRes.bytes ?? sponsoredRes.transactionBytes ?? sponsoredRes.txBytes;
  const digest = sponsoredRes.digest;
  if (!b64 || !digest) throw new Error(`Unexpected /sponsor response shape: ${JSON.stringify(sponsoredRes).slice(0,500)}`);
  const txBytes = Buffer.from(b64, "base64");
  const signed = await keypair.signTransaction(txBytes);
  const execRes = await postJson(`${RELAYER}/sponsor/execute`, { digest, sender, signature: signed.signature });
  const finalDigest = execRes.digest ?? digest;
  console.log(`${label}: executed digest=${finalDigest}`);
  return finalDigest;
}

async function findAccountId() {
  const query = `{ events(last: 5, filter: { type: "${PACKAGE_ID}::account::AccountCreated", sender: "${sender}" }) { nodes { contents { json } } } }`;
  const r = await fetch("https://graphql.mainnet.sui.io/graphql", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query }) }).then(x => x.json());
  const nodes = r?.data?.events?.nodes ?? [];
  return nodes.length ? nodes[nodes.length - 1]?.contents?.json?.account_id : undefined;
}

async function waitAccountId(tries = 12) {
  for (let i = 0; i < tries; i++) {
    const id = await findAccountId();
    if (id) return id;
    await new Promise(r => setTimeout(r, 5000));
  }
  return undefined;
}

const state = loadState();
try {
  // Step 1: account (skip if already created in a prior partial run)
  let accountId = state.accountId || await findAccountId();
  let createDigest = state.createDigest;
  if (!accountId) {
    const tx = new Transaction();
    tx.moveCall({ target: `${PACKAGE_ID}::account::create_account`, arguments: [tx.object(REGISTRY_ID), tx.object(CLOCK)] });
    createDigest = await sponsored(tx, "create_account");
    state.createDigest = createDigest; saveState(state);
    // wait for tx + resolve account id
    try { await client.waitForTransaction({ digest: createDigest, include: { effects: true, objectTypes: true }, options: { showEffects: true, showObjectChanges: true } }); } catch (e) { console.log("waitForTransaction note:", String(e).slice(0, 300)); }
    accountId = await waitAccountId();
    if (!accountId) throw new Error(`create_account executed (${createDigest}) but accountId not resolvable via GraphQL events`);
    state.accountId = accountId; saveState(state);
  }
  console.log("ACCOUNT_ID:", accountId, "createDigest:", createDigest);

  // Step 2: delegate key (reuse persisted public key material from state if present — private key lives only in .env once written)
  let delegatePubHex = state.delegatePubHex;
  let delegateSui = state.delegateSui;
  if (!state.delegateDigest) {
    // generate fresh delegate; write its private key to .env immediately (only place)
    const delegate = await generateDelegateKey();
    delegatePubHex = Buffer.from(delegate.publicKey).toString("hex");
    delegateSui = delegate.suiAddress;
    state.delegatePubHex = delegatePubHex; state.delegateSui = delegateSui;
    state.pendingDelegatePrivateKey = true; saveState(state);
    writeEnv(delegate.privateKey, accountId, delegatePubHex);
    const tx2 = new Transaction();
    tx2.moveCall({
      target: `${PACKAGE_ID}::account::add_delegate_key`,
      arguments: [tx2.object(accountId), tx2.object(REGISTRY_ID), tx2.pure.vector("u8", Array.from(delegate.publicKey)), tx2.pure.string("AgentMart agent"), tx2.object(CLOCK)],
    });
    const d = await sponsored(tx2, "add_delegate_key");
    state.delegateDigest = d; delete state.pendingDelegatePrivateKey; saveState(state);
    console.log("DELEGATE_ADDED digest:", d);
  }
  console.log("DELEGATE_PUBLIC_KEY_HEX:", delegatePubHex);
  console.log("DELEGATE_SUI_ADDRESS:", delegateSui);
  console.log("RESULT_JSON:", JSON.stringify({ accountId, createDigest: createDigest ?? null, delegateDigest: state.delegateDigest, delegatePubHex, delegateSui }));
} catch (err) {
  const rec = { when: new Date().toISOString(), url: err.url ?? null, status: err.status ?? null, requestBody: err.requestBody ? { ...err.requestBody, authSignature: err.requestBody.authSignature ? "<signature omitted from doc>" : undefined } : null, responseBody: err.body ?? null, message: String(err?.message ?? err).slice(0, 2000) };
  fs.writeFileSync(path.join(HERE, "failure.json"), JSON.stringify(rec, null, 2));
  console.error("FAILED:", rec.message);
  process.exit(2);
}

function writeEnv(delegatePrivateKeyHex, accountId, delegatePubHex) {
  const example = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8");
  let out = example
    .replace(/^MEMWAL_PRIVATE_KEY=.*$/m, `MEMWAL_PRIVATE_KEY=${delegatePrivateKeyHex}`)
    .replace(/^MEMWAL_ACCOUNT_ID=.*$/m, `MEMWAL_ACCOUNT_ID=${accountId}`)
    .replace(/^MEMWAL_AGENT_ID=.*$/m, `MEMWAL_AGENT_ID=${delegatePubHex}`)
    .replace(/^SUI_ADDRESS=.*$/m, `SUI_ADDRESS=${EXPECTED}`);
  fs.writeFileSync(path.join(ROOT, ".env"), out, { mode: 0o600 });
  fs.chmodSync(path.join(ROOT, ".env"), 0o600);
  console.log(".env written (mode 600) with delegate key + account + agent id.");
}
