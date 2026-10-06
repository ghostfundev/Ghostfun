export type Market = {
  id: number;
  token: string;
  creator: string;
  name: string;
  symbol: string;
  icon: string | null;
  description: string;
  poolId: string;
  quote: string;
  priceUsd: number;
  priceNear: number;
  marketCapUsd: number;
  volume24hUsd: number;
  volume24hNear: number;
  change24h: number;
  holders: number;
  trades24h: number;
  createdAt: number;
  feeMode: string;
  creatorShareBps: number;
  nearUsd: number;
  links: { website?: string | null; twitter?: string | null; telegram?: string | null };
};

export type NetworkStats = {
  launches: number;
  volumeUsd: number;
  trades: number;
  nearUsd: number;
};

export type LaunchCost = {
  launch_fee: string;
  token_storage: string;
  pool_create: string;
  dcl_storage: string;
  dev_buy: string;
  total: string;
};

export type TradeQuote = {
  token: string;
  side: "buy" | "sell";
  poolId: string;
  amountInRaw: string;
  quoteInputRaw: string;
  outputRaw: string;
  minOutputRaw: string;
  output: string;
  minimum: string;
  inputSymbol: string;
  outputSymbol: string;
  tokenDecimals: number;
  buyTaxBps: number;
  sellTaxBps: number;
  slippageBps: number;
  priceImpact: number | null;
};
