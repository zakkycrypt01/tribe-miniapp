import type { ImagePlaceholder } from "@/lib/placeholder-images";

export type Token = {
  id: string;
  symbol: string;
  name: string;
  icon: ImagePlaceholder;
};

export type LpPosition = {
  id: string;
  protocol: 'Aerodrome' | 'Uniswap V3';
  pair: [Token, Token];
  value: number;
  isTribeStrategy: boolean;
  range?: { min: number; max: number; inRange: boolean };
};

export type Leader = {
  id: string;
  name: string;
  avatar: ImagePlaceholder;
  walletAddress: string;
  strategyDescription: string;
  apy30d: number;
  totalFees: number;
  riskScore: 'Low' | 'Medium' | 'High';
  followers: number;
  tvl: number;
  maxDrawdown: number;
  historicalApy: { date: string; apy: number }[];
  followersPnl: number;
  winRate: number;
  sharpeRatio: number;
  followerCount: number;
  maxFollowers: number;
};

export type ActionHistoryItem = {
  id: string;
  action: 'Swap' | 'Add Liquidity' | 'Remove Liquidity' | 'Adjust Range';
  details: string;
  timestamp: Date;
  gasCost: number; // in ETH
  txHash: string;
};

export type UniswapPool = {
  id: string;
  pair: [Token, Token];
  protocolVersion: 'v2' | 'v3' | 'v4';
  feeTier: number;
  tvl: number;
  tvlChange: number;
  poolApr: number;
  rewardApr?: number;
  volume1d: number;
  volume1dChange: number;
f: number;
  fees1d: number;
  poolAddress: string;
  poolBalances: { token: Token, amount: number }[];
  historicalData: { time: string; volume: number }[];
};

export type PoolTransaction = {
    id: string;
    type: 'Swap' | 'Add' | 'Remove';
    details: string;
    value: number;
    account: string;
    timestamp: Date;
    txHash: string;
}
