/**
 * Tatum Sui client — GraphQL ONLY.
 *
 * Verified during the build: Tatum's Sui JSON-RPC endpoint returns 404;
 * Sui reads must go through the GraphQL gateway:
 *   POST https://sui-mainnet.gateway.tatum.io/graphql
 *   Header: x-api-key: <TATUM_API_KEY>
 *
 * Every method degrades gracefully to clearly-labelled mock data when no
 * TATUM_API_KEY is configured, so `npm run demo` works fully offline.
 */

const TATUM_GRAPHQL_URL = "https://sui-mainnet.gateway.tatum.io/graphql";

export class TatumSui {
  constructor({ apiKey, address }) {
    this.apiKey = apiKey || "";
    this.address = address;
    this.live = Boolean(this.apiKey);
  }

  async graphql(query, variables = {}) {
    const res = await fetch(TATUM_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      throw new Error(`Tatum GraphQL HTTP ${res.status}: ${await res.text()}`);
    }
    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(`Tatum GraphQL errors: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  }

  /** Latest checkpoint sequence number on Sui mainnet. */
  async getCheckpoint() {
    if (!this.live) {
      return { sequenceNumber: 271828182, mode: "mock (no TATUM_API_KEY)" };
    }
    const data = await this.graphql(
      `query { checkpoint { sequenceNumber digest timestamp } }`,
    );
    return { ...data.checkpoint, mode: "live via Tatum GraphQL" };
  }

  /** Total SUI balance for the AgentMart wallet. */
  async getBalance() {
    if (!this.live) {
      return { totalBalance: "1250000000", coinType: "0x2::sui::SUI", mode: "mock (no TATUM_API_KEY)" };
    }
    const data = await this.graphql(
      `query($address: SuiAddress!) {
         address(address: $address) {
           balance(coinType: "0x2::sui::SUI") { totalBalance coinType }
         }
       }`,
      { address: this.address },
    );
    return { ...(data?.address?.balance ?? { totalBalance: "0" }), mode: "live via Tatum GraphQL" };
  }

  /** Recent transactions affecting the AgentMart wallet. */
  async getRecentTransactions(limit = 5) {
    if (!this.live) {
      return {
        mode: "mock (no TATUM_API_KEY)",
        transactions: [
          { digest: "MockDigest1111111111111111111111111111111111", status: "SUCCESS" },
          { digest: "MockDigest2222222222222222222222222222222222", status: "SUCCESS" },
        ],
      };
    }
    const data = await this.graphql(
      `query($address: SuiAddress!, $first: Int!) {
         transactions(first: $first, filter: { affectedAddress: $address }) {
           nodes { digest effects { status } }
         }
       }`,
      { address: this.address, first: limit },
    );
    const nodes = data?.transactions?.nodes ?? [];
    return {
      mode: "live via Tatum GraphQL",
      transactions: nodes.map((n) => ({
        digest: n.digest,
        status: n.effects?.status ?? "unknown",
      })),
    };
  }
}
