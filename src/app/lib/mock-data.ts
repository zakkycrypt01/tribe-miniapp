import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";
import type { Token, LpPosition, Leader, ActionHistoryItem, UniswapPool, PoolTransaction } from './types';

const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img]));

const TOKENS: Token[] = [
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', icon: imageMap.get('token-eth')! },
  { id: 'weth', symbol: 'WETH', name: 'Wrapped Ethereum', icon: imageMap.get('token-weth')! },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: imageMap.get('token-usdc')! },
  { id: 'wbtc', symbol: 'WBTC', name: 'Wrapped BTC', icon: imageMap.get('token-wbtc')! },
  { id: 'uni', symbol: 'UNI', name: 'Uniswap', icon: imageMap.get('token-uni')! },
];
const tokenMap = new Map(TOKENS.map(t => [t.id, t]));

const LEADERS: Leader[] = [
  {
    id: 'leader-1',
    name: 'Progressive trading TOP ...',
    avatar: imageMap.get('avatar-1')!,
    walletAddress: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
    strategyDescription: 'Focus on high-volume stable pairs with active range management on Uniswap V3 to maximize fee collection while minimizing impermanent loss. Ideal for capturing volatility in stable markets.',
    apy30d: 509.16,
    totalFees: 5917.86,
    riskScore: 'Low',
    followers: 1337,
    tvl: 2500000,
    maxDrawdown: 0.53,
    historicalApy: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      apy: 20 + Math.sin(i / 3) * 5 + Math.random() * 3,
    })),
    followersPnl: 58541.62,
    winRate: 74.86,
    sharpeRatio: 25.16,
    followerCount: 103,
    maxFollowers: 300,
  },
  {
    id: 'leader-2',
    name: 'juragantrqder88',
    avatar: imageMap.get('avatar-2')!,
    walletAddress: '0x1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ',
    strategyDescription: 'Long-term holding strategy in a volatile USDC/ETH pair on Aerodrome. This is a high-risk, high-reward approach aimed at earning both fees and USDC emissions.',
    apy30d: 300.87,
    totalFees: 1089.60,
    riskScore: 'High',
    followers: 420,
    tvl: 850000,
    maxDrawdown: 2.68,
    historicalApy: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      apy: 60 + Math.cos(i / 5) * 20 + Math.random() * 10,
    })),
    followersPnl: -1548.13,
    winRate: 62.23,
    sharpeRatio: 28.88,
    followerCount: 299,
    maxFollowers: 300,
  },
  {
    id: 'leader-3',
    name: 'Quantum X',
    avatar: imageMap.get('avatar-3')!,
    walletAddress: '0x994a1B2A1E6971958277258004944894C4ade7d6',
    strategyDescription: 'Balanced portfolio leveraging both Uniswap V3 (WBTC/ETH) and Aerodrome (ETH/USDC) to diversify risk and capture fees from different market segments. Moderate risk.',
    apy30d: 282.42,
    totalFees: 3420.07,
    riskScore: 'Medium',
    followers: 859,
    tvl: 1200000,
    maxDrawdown: 0.48,
    historicalApy: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      apy: 40 + Math.sin(i / 2) * 10 + Math.random() * 5,
    })),
    followersPnl: 4269.78,
    winRate: 83.60,
    sharpeRatio: 19.5,
    followerCount: 5,
    maxFollowers: 300,
  },
    {
    id: 'leader-4',
    name: 'Yield Farmer',
    avatar: imageMap.get('avatar-4')!,
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    strategyDescription: 'This strategy focuses on farming rewards from the UNI/ETH pool on Uniswap, combined with occasional swaps to rebalance. It is a medium risk strategy for those bullish on UNI.',
    apy30d: 33.8,
    totalFees: 6730.22,
    riskScore: 'Medium',
    followers: 672,
    tvl: 950000,
    maxDrawdown: 22.1,
    historicalApy: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      apy: 30 + Math.cos(i / 4) * 8 + Math.random() * 4,
    })),
    followersPnl: 12034.21,
    winRate: 68.5,
    sharpeRatio: 12.3,
    followerCount: 250,
    maxFollowers: 300,
  },
];
const leaderMap = new Map(LEADERS.map(l => [l.id, l]));

const LP_POSITIONS: { [leaderId: string]: LpPosition[] } = {
  'leader-1': [
    {
      id: 'pos-1',
      protocol: 'Uniswap V3',
      pair: [tokenMap.get('eth')!, tokenMap.get('usdc')!],
      value: 1800000,
      isTribeStrategy: true,
      range: { min: 2800, max: 3600, inRange: true },
    },
    {
      id: 'pos-2',
      protocol: 'Aerodrome',
      pair: [tokenMap.get('eth')!, tokenMap.get('uni')!],
      value: 500000,
      isTribeStrategy: false,
    },
     {
      id: 'pos-3',
      protocol: 'Uniswap V3',
      pair: [tokenMap.get('wbtc')!, tokenMap.get('eth')!],
      value: 200000,
      isTribeStrategy: false,
      range: { min: 18.5, max: 22.5, inRange: false },
    },
  ],
};

const ACTION_HISTORY: { [leaderId: string]: ActionHistoryItem[] } = {
  'leader-1': [
    {
      id: 'act-1',
      action: 'Adjust Range',
      details: 'Adjusted ETH/USDC range to $2800-$3600',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      gasCost: 0.0045,
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    {
      id: 'act-2',
      action: 'Add Liquidity',
      details: 'Added 50 ETH and 145,000 USDC to pool',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      gasCost: 0.0081,
      txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
    {
      id: 'act-3',
      action: 'Swap',
      details: 'Swapped 10 ETH for 29,500 USDC',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      gasCost: 0.0023,
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
     {
      id: 'act-4',
      action: 'Remove Liquidity',
      details: 'Removed 10% from USDC/ETH position',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      gasCost: 0.005,
      txHash: '0x9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcd',
    },
  ],
};

const UNISWAP_POOLS: UniswapPool[] = [
  {
    id: 'pool-1',
    pair: [tokenMap.get('eth')!, tokenMap.get('usdc')!],
    protocolVersion: 'v2',
    feeTier: 0.3,
    tvl: 11400000,
    tvlChange: 4.19,
    poolApr: 3.18,
    volume1d: 331200,
    volume1dChange: 47.7,
    f: 0.3,
    fees1d: 996.42,
    poolAddress: '0x6a775a782a5a5a1f6f5d8e9e1f5d8e9e1f5d8e9e',
    poolBalances: [
      { token: tokenMap.get('eth')!, amount: 1500 },
      { token: tokenMap.get('usdc')!, amount: 3800000000 },
    ],
    historicalData: Array.from({ length: 24 }, (_, i) => ({
      time: `h${i}`,
      volume: Math.random() * 40000 + 10000,
    })),
  },
  {
    id: 'pool-2',
    pair: [tokenMap.get('eth')!, tokenMap.get('uni')!],
    protocolVersion: 'v2',
    feeTier: 0.3,
    tvl: 10400000,
    tvlChange: -2.3,
    poolApr: 13.73,
    volume1d: 1300000,
    volume1dChange: -12.5,
    f: 0.3,
    fees1d: 3900,
    poolAddress: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    poolBalances: [
      { token: tokenMap.get('eth')!, amount: 1800 },
      { token: tokenMap.get('usdc')!, amount: 5400000 },
    ],
    historicalData: Array.from({ length: 24 }, (_, i) => ({
      time: `h${i}`,
      volume: Math.random() * 80000 + 20000,
    })),
  },
   {
    id: 'pool-3',
    pair: [tokenMap.get('usdc')!, tokenMap.get('wbtc')!], // Mocking USSI as USDC
    protocolVersion: 'v2',
    feeTier: 0.3,
    tvl: 6000000,
    tvlChange: 0.1,
    poolApr: 0.00,
    volume1d: 60,
    volume1dChange: 5.2,
    f: 0.3,
    fees1d: 0.18,
    poolAddress: '0x12345a782a5a5a1f6f5d8e9e1f5d8e9e1f5d8e9e',
    poolBalances: [
      { token: tokenMap.get('uni')!, amount: 3000000 },
      { token: tokenMap.get('usdc')!, amount: 3000000 },
    ],
    historicalData: Array.from({ length: 24 }, (_, i) => ({
      time: `h${i}`,
      volume: Math.random() * 10,
    })),
  },
  {
    id: 'pool-4',
    pair: [tokenMap.get('eth')!, tokenMap.get('wbtc')!],
    protocolVersion: 'v4',
    feeTier: 1,
    tvl: 3500000,
    tvlChange: 15.6,
    poolApr: 5.37,
    volume1d: 52100,
    volume1dChange: 88.1,
    f: 1,
    fees1d: 521,
    poolAddress: '0xabcde6a782a5a5a1f6f5d8e9e1f5d8e9e1f5d8e9e',
    poolBalances: [
      { token: tokenMap.get('eth')!, amount: 500 },
      { token: tokenMap.get('wbtc')!, amount: 1500000 },
    ],
    historicalData: Array.from({ length: 24 }, (_, i) => ({
      time: `h${i}`,
      volume: Math.random() * 10000 + 2000,
    })),
  },
];
const uniswapPoolMap = new Map(UNISWAP_POOLS.map(p => [p.id, p]));

const POOL_TRANSACTIONS: PoolTransaction[] = Array.from({ length: 20 }, (_, i) => {
    const isSwap = i % 3 !== 0;
    const token1 = i % 2 === 0 ? tokenMap.get('eth')! : tokenMap.get('usdc')!;
    const token2 = token1.id === 'eth' ? tokenMap.get('usdc')! : tokenMap.get('eth')!;
    const amount1 = isSwap ? ((i + 1) * 0.8).toFixed(2) : ((i + 1) * 0.4).toFixed(2);
    const amount2 = isSwap ? (parseFloat(amount1) * (3000 + (i * 10))).toLocaleString(undefined, {maximumFractionDigits: 0}) : (parseFloat(amount1) * 3000).toLocaleString(undefined, {maximumFractionDigits: 0});

    return {
        id: `txn-${i}`,
        type: isSwap ? 'Swap' : (i % 4 === 0 ? 'Add' : 'Remove'),
        details: isSwap 
            ? `Swap ${amount1} ${token1.symbol} for ${amount2} ${token2.symbol}`
            : `Add ${amount1} ${token1.symbol} and ${amount2} ${token2.symbol}`,
        value: (parseFloat(amount1) * 3100),
        account: `0x${(i * 1000 + 1234).toString(16)}...${(i * 1000 + 5678).toString(16)}`,
        timestamp: new Date(Date.now() - i * 30 * 60 * 1000),
        txHash: `0x${(i).toString(16).padStart(64, '0')}`
    };
});


export function getLeaders() {
  return LEADERS;
}

export function getLeaderData(id: string) {
  return leaderMap.get(id);
}

export function getLpPositions(leaderId: string) {
  return LP_POSITIONS[leaderId] || [];
}

export function getActionHistory(leaderId: string) {
  return ACTION_HISTORY[leaderId] || [];
}

export function getTokens() {
  return TOKENS;
}

export function getUniswapPools() {
    return UNISWAP_POOLS;
}

export function getUniswapPoolData(id: string) {
    return uniswapPoolMap.get(id);
}

export function getPoolTransactions() {
    return POOL_TRANSACTIONS;
}
