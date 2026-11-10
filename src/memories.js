/**
 * Shared seed memories for AgentMart Recall.
 *
 * Each entry is a single, self-contained fact the agent learned from a past
 * marketplace interaction. Wording is deliberate: every fact carries the
 * keywords a future recall query will use ("counterparty trust",
 * "listing preference", "price ceiling", "negotiation outcome"), which keeps
 * recall precise in BOTH modes — the real Walrus Memory relayer (semantic
 * embeddings) and MemWalMock (deterministic token-overlap ranking).
 *
 * 14 distinct memories — comfortably above the hackathon's 10+ memories
 * on Mainnet bar once real delegate keys are configured.
 */
export const SEED_MEMORIES = [
  "Counterparty trust: Nova Resellers has a trust score of 2 out of 10. Nova Resellers delivered a misdescribed item in October 2026 and then refused a refund. Decision rule: refuse any listing or trade from Nova Resellers.",
  "Counterparty trust: PixelVault Store has a trust score of 9 out of 10. PixelVault Store completed 14 trades with AgentMart, always on time and exactly as described. Decision rule: fast-track PixelVault Store listings.",
  "Counterparty trust: QuickFlip Deals has a trust score of 4 out of 10. QuickFlip Deals shipped late twice and changed the price after agreement once. Decision rule: only trade with QuickFlip Deals with escrow and a written price lock.",
  "Listing preference: the buyer prefers refurbished business laptops, especially ThinkPad and Dell Latitude models, over consumer laptops. Prioritise refurbished laptop listings in recommendations.",
  "Listing preference: the buyer prefers listings in the electronics category, specifically laptops, phones, and audio gear. Deprioritise furniture and clothing listings.",
  "Price ceiling: for a used iPhone, the buyer price ceiling is 500 US dollars. Negotiation outcome rule: never accept an iPhone price above 500 dollars; counter at 500 dollars instead.",
  "Price ceiling: for a refurbished ThinkPad laptop, the buyer price ceiling is 800 US dollars. A ThinkPad bought at 750 dollars in October 2026 was a good negotiation outcome.",
  "Negotiation outcome: seller GadgetHub accepted 450 dollars for an iPhone listed at 600 dollars after AgentMart cited comparable sales. GadgetHub responds well to evidence-based counter offers.",
  "Negotiation outcome: seller SoundWave Audio refused any discount on headphones listed at 220 dollars and the trade was abandoned. Do not spend more than one counter offer round with SoundWave Audio.",
  "Listing preference: the buyer wants items with at least a 6 month warranty and original packaging preferred. Listings without warranty should be discounted by at least 15 percent in valuation.",
  "Counterparty trust: Harbour Tech has a trust score of 8 out of 10. Harbour Tech provided verifiable receipts and serial numbers for every trade. Decision rule: accept Harbour Tech verification documents without extra checks.",
  "Price ceiling: for wireless headphones, the buyer price ceiling is 150 US dollars. Negotiation outcome rule: a headphones offer above 150 dollars should be declined or countered at 150 dollars.",
  "Negotiation outcome: a bundle deal with PixelVault Store — laptop plus dock — closed at 900 dollars against a 1100 dollar ask, the best negotiation outcome recorded. Bundles with trusted counterparties are preferred.",
  "Listing preference: the buyer is based in Dallas Texas and prefers local pickup or shipping within the United States. International shipping listings are deprioritised due to customs delays experienced in September 2026.",
];
