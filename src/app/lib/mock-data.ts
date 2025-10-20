import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";
import type { Token, LpPosition, Leader, ActionHistoryItem, UniswapPool, PoolTransaction } from './types';
import { useReadContract, useAccount } from "wagmi";
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import { useQueries } from "@tanstack/react-query";


const useLeaderRegistryGetAllLeaders = () => {
  return useReadContract({
    address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
    abi: ABIS.TribeLeaderRegistry,
    functionName: "getAllLeaders",
  });
}
const useLeaderRegistryGetLeader = (address: string) => {
  return useReadContract({
    address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
    abi: ABIS.TribeLeaderRegistry,
    functionName: "leaders",
    args: [address],
  });
}

const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img]));

const TOKENS: Token[] = [
  { id: 'eth', symbol: 'ETH', name: 'Ethereum', icon: imageMap.get('token-eth')! },
  { id: 'weth', symbol: 'WETH', name: 'Wrapped Ethereum', icon: imageMap.get('token-weth')! },
  { id: 'usdc', symbol: 'USDC', name: 'USD Coin', icon: imageMap.get('token-usdc')! },
  { id: 'wbtc', symbol: 'WBTC', name: 'Wrapped BTC', icon: imageMap.get('token-wbtc')! },
  { id: 'uni', symbol: 'UNI', name: 'Uniswap', icon: imageMap.get('token-uni')! },
];
const tokenMap = new Map(TOKENS.map(t => [t.id, t]));



function mapContractLeaderToLeader(contractLeader: any): Leader {
  const defaultAvatar = imageMap.get('avatar-1')!;
  return {
    id: contractLeader.wallet || '',
    name: contractLeader.strategyName || '',
    avatar: defaultAvatar,
    walletAddress: contractLeader.wallet || '',
    strategyDescription: contractLeader.description || '',
    apy30d: 0,
    totalFees: 0,
    riskScore: 'Low', 
    followers: Number(contractLeader.totalFollowers) || 0,
    tvl: Number(contractLeader.totalTvl) || 0,
    maxDrawdown: 0,
    historicalApy: [],
    followersPnl: 0,
    winRate: 0,
    sharpeRatio: 0,
    followerCount: Number(contractLeader.totalFollowers) || 0,
    maxFollowers: 0,
  };
}

function useLeadersFromContract(): Leader[] {
  const { data: addresses } = useLeaderRegistryGetAllLeaders();
  if (!Array.isArray(addresses) || addresses.length === 0) return [];

  const queries = useQueries({
    queries: addresses.map((addr: string) => ({
      queryKey: ["leader", addr],
      queryFn: async () => {
        const { data } = useLeaderRegistryGetLeader(addr);
        return data ? mapContractLeaderToLeader(data) : null;
      },
      enabled: !!addr,
    })),
  });

  return queries.map(q => q.data).filter(Boolean) as Leader[];
}

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
    protocolVersion: 'v3',
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
    protocolVersion: 'v3',
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
    protocolVersion: 'v3',
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
    protocolVersion: 'v3',
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



// Example: getLeaders expects an array of addresses
// You may want to pass the addresses you want to fetch here
export function getLeaders() {
  return useLeadersFromContract();
}


// Example: getLeaderData expects a wallet address
export function getLeaderData(address: string) {
  const { data } = useLeaderRegistryGetLeader(address);
  return data ? mapContractLeaderToLeader(data) : null;
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
