import { createPublicClient, http, parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Token, CurrencyAmount, Percent } from '@uniswap/sdk-core';
import { Pool, Position, nearestUsableTick, TickMath, priceToClosestTick, encodeSqrtRatioX96 } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';

// Base Sepolia addresses
const NONFUNGIBLE_POSITION_MANAGER = '0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2';
const POOL_FACTORY_ADDRESS = '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24';

// Token definitions
const USDC_TOKEN = new Token(
  84532,
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  6,
  'USDC',
  'USD Coin'
);

const WETH_TOKEN = new Token(
  84532,
  '0x4200000000000000000000000000000000000006',
  18,
  'WETH',
  'Wrapped Ether'
);

const WBTC_TOKEN = new Token(
  84532,
  '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
  8,
  'WBTC',
  'Wrapped BTC'
);

const UNI_TOKEN = new Token(
  84532,
  '0xB62b54F9b13F3bE72A65117a705c930e42563ab4',
  18,
  'UNI',
  'Uniswap'
);

// ABIs
const POOL_ABI = [
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'tickSpacing',
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint24', name: '', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

const POSITION_MANAGER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'token0', type: 'address' },
          { internalType: 'address', name: 'token1', type: 'address' },
          { internalType: 'uint24', name: 'fee', type: 'uint24' },
          { internalType: 'int24', name: 'tickLower', type: 'int24' },
          { internalType: 'int24', name: 'tickUpper', type: 'int24' },
          { internalType: 'uint256', name: 'amount0Desired', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Desired', type: 'uint256' },
          { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
          { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
          { internalType: 'address', name: 'recipient', type: 'address' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
        ],
        internalType: 'struct INonfungiblePositionManager.MintParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'mint',
    outputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

interface LiquidityParams {
  token0: Token;
  token1: Token;
  fee: number;
  amount0: string;
  amount1: string;
  tickLower?: number;
  tickUpper?: number;
  slippageTolerance?: number;
}

interface LiquidityPosition {
  amount0: string;
  amount1: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  amount0Min: string;
  amount1Min: string;
  currentPrice: string;
  priceRange: {
    lower: string;
    upper: string;
  };
}

/**
 * Get pool address from factory
 */
async function getPoolAddress(
  client: any,
  token0: Token,
  token1: Token,
  fee: number
): Promise<`0x${string}`> {
  const [tokenA, tokenB] = token0.sortsBefore(token1) ? [token0, token1] : [token1, token0];
  
  const poolAddress = await client.readContract({
    address: POOL_FACTORY_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [tokenA.address as `0x${string}`, tokenB.address as `0x${string}`, fee],
  });

  if (poolAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`Pool does not exist for ${token0.symbol}/${token1.symbol} with fee ${fee}`);
  }

  return poolAddress;
}

/**
 * Get pool state from blockchain
 */
async function getPoolState(
  client: any,
  poolAddress: `0x${string}`
): Promise<{ pool: any; tickSpacing: number }> {
  try {
    const [liquidity, slot0, tickSpacing] = await Promise.all([
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'liquidity',
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'slot0',
      }),
      client.readContract({
        address: poolAddress,
        abi: POOL_ABI,
        functionName: 'tickSpacing',
      }),
    ]);

    return {
      pool: {
        sqrtPriceX96: slot0[0],
        tick: slot0[1],
        liquidity,
      },
      tickSpacing: Number(tickSpacing),
    };
  } catch (error) {
    console.error('Error fetching pool state:', error);
    throw new Error(`Failed to fetch pool state for address ${poolAddress}. Pool may not exist.`);
  }
}

/**
 * Convert CurrencyAmount to string representation
 */
function currencyAmountToString(amount: CurrencyAmount<Token>, decimals: number): string {
  return formatUnits(BigInt(amount.quotient.toString()), decimals);
}

/**
 * Calculate liquidity position details
 */
async function calculateLiquidityPosition(
  params: LiquidityParams
): Promise<LiquidityPosition> {
  const {
    token0,
    token1,
    fee,
    amount0,
    amount1,
    tickLower: customTickLower,
    tickUpper: customTickUpper,
    slippageTolerance = 0.5,
  } = params;

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  // Get pool address from factory
  const poolAddress = await getPoolAddress(client, token0, token1, fee);
  console.log(`Pool address: ${poolAddress}`);

  const { pool: poolState, tickSpacing } = await getPoolState(client, poolAddress);

  // Create Pool instance - convert values properly
  const pool = new Pool(
    token0,
    token1,
    fee,
    poolState.sqrtPriceX96.toString(),
    poolState.liquidity.toString(),
    Number(poolState.tick)
  );

  // Calculate tick range
  let tickLower: number;
  let tickUpper: number;

  if (customTickLower !== undefined && customTickUpper !== undefined) {
    tickLower = nearestUsableTick(customTickLower, tickSpacing);
    tickUpper = nearestUsableTick(customTickUpper, tickSpacing);
  } else {
    // Default: Set range to +/- 10% from current price
    const currentTick = Number(poolState.tick);
    const tickRange = Math.floor(tickSpacing * 100); // Approximately 10% range
    tickLower = nearestUsableTick(currentTick - tickRange, tickSpacing);
    tickUpper = nearestUsableTick(currentTick + tickRange, tickSpacing);
  }

  // Parse amounts using JSBI for Uniswap SDK compatibility
  const amount0Desired = parseUnits(amount0, token0.decimals).toString();
  const amount1Desired = parseUnits(amount1, token1.decimals).toString();

  // Create position
  const position = Position.fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: amount0Desired,
    amount1: amount1Desired,
    useFullPrecision: true,
  });

  // Calculate minimum amounts with slippage
  const slippagePercent = new Percent(Math.floor(slippageTolerance * 100), 10000);
  const slippageAdjustment = 10000 - Math.floor(slippageTolerance * 100);
  const amount0Min = position.amount0.multiply(
    new Percent(slippageAdjustment, 10000)
  );
  const amount1Min = position.amount1.multiply(
    new Percent(slippageAdjustment, 10000)
  );

  return {
    amount0: currencyAmountToString(position.amount0, token0.decimals),
    amount1: currencyAmountToString(position.amount1, token1.decimals),
    liquidity: position.liquidity.toString(),
    tickLower,
    tickUpper,
    amount0Min: currencyAmountToString(amount0Min, token0.decimals),
    amount1Min: currencyAmountToString(amount1Min, token1.decimals),
    currentPrice: pool.token0Price.toSignificant(6),
    priceRange: {
      lower: TickMath.getSqrtRatioAtTick(tickLower).toString(),
      upper: TickMath.getSqrtRatioAtTick(tickUpper).toString(),
    },
  };
}

/**
 * Generate mint parameters for adding liquidity
 */
async function getMintParams(
  params: LiquidityParams,
  recipient: `0x${string}`
) {
  const position = await calculateLiquidityPosition(params);
  const { token0, token1, fee } = params;

  // Sort tokens
  const [tokenA, tokenB] = token0.sortsBefore(token1) 
    ? [token0, token1] 
    : [token1, token0];

  const [amountA, amountB, amountAMin, amountBMin] = token0.sortsBefore(token1)
    ? [position.amount0, position.amount1, position.amount0Min, position.amount1Min]
    : [position.amount1, position.amount0, position.amount1Min, position.amount0Min];

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 minutes

  return {
    token0: tokenA.address as `0x${string}`,
    token1: tokenB.address as `0x${string}`,
    fee,
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    amount0Desired: parseUnits(amountA, tokenA.decimals),
    amount1Desired: parseUnits(amountB, tokenB.decimals),
    amount0Min: parseUnits(amountAMin, tokenA.decimals),
    amount1Min: parseUnits(amountBMin, tokenB.decimals),
    recipient,
    deadline,
  };
}

/**
 * Calculate optimal amounts for single-sided liquidity
 */
async function calculateOptimalAmounts(
  tokenIn: Token,
  tokenOut: Token,
  fee: number,
  amountIn: string,
  tickLower?: number,
  tickUpper?: number
): Promise<{ amount0: string; amount1: string }> {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const poolAddress = await getPoolAddress(client, tokenIn, tokenOut, fee);
  const { pool: poolState, tickSpacing } = await getPoolState(client, poolAddress);

  const pool = new Pool(
    tokenIn,
    tokenOut,
    fee,
    poolState.sqrtPriceX96.toString(),
    poolState.liquidity.toString(),
    Number(poolState.tick)
  );

  const currentTick = Number(poolState.tick);
  const lower = tickLower !== undefined 
    ? nearestUsableTick(tickLower, tickSpacing)
    : nearestUsableTick(currentTick - tickSpacing * 100, tickSpacing);
  const upper = tickUpper !== undefined
    ? nearestUsableTick(tickUpper, tickSpacing)
    : nearestUsableTick(currentTick + tickSpacing * 100, tickSpacing);

  const inputAmount = parseUnits(amountIn, tokenIn.decimals).toString();

  const isToken0 = tokenIn.sortsBefore(tokenOut);
  
  let position: Position;
  if (isToken0) {
    position = Position.fromAmount0({
      pool,
      tickLower: lower,
      tickUpper: upper,
      amount0: inputAmount,
      useFullPrecision: true,
    });
  } else {
    position = Position.fromAmount1({
      pool,
      tickLower: lower,
      tickUpper: upper,
      amount1: inputAmount,
    });
  }
  return {
    amount0: currencyAmountToString(position.amount0, pool.token0.decimals),
    amount1: currencyAmountToString(position.amount1, pool.token1.decimals),
  };
}

// Example usage
async function main() {
  console.log('💧 Uniswap V3 Liquidity Addition - Base Sepolia\n');

  try {
    // First, let's check if the pool exists
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    console.log('━━━ Checking Pool Existence ━━━');
    const poolAddress = await getPoolAddress(client, USDC_TOKEN, WETH_TOKEN, 3000);
    console.log(`USDC/WETH 0.3% pool address: ${poolAddress}`);

    // Example 1: Calculate liquidity position
    console.log('\n━━━ Calculate Position: 10 USDC + 0.003 WETH ━━━');
    const position = await calculateLiquidityPosition({
      token0: USDC_TOKEN,
      token1: WETH_TOKEN,
      fee: 3000,
      amount0: '10',
      amount1: '0.003',
      slippageTolerance: 0.5,
    });

    console.log(`Token0 Amount: ${position.amount0} ${USDC_TOKEN.symbol}`);
    console.log(`Token1 Amount: ${position.amount1} ${WETH_TOKEN.symbol}`);
    console.log(`Liquidity: ${position.liquidity}`);
    console.log(`Tick Range: ${position.tickLower} to ${position.tickUpper}`);
    console.log(`Current Price: ${position.currentPrice}`);
    console.log(`Min Token0 (with slippage): ${position.amount0Min}`);
    console.log(`Min Token1 (with slippage): ${position.amount1Min}\n`);

    // Example 2: Calculate optimal amounts from single-sided input
    console.log('━━━ Optimal Amounts for 10 USDC ━━━');
    const optimal = await calculateOptimalAmounts(
      USDC_TOKEN,
      WETH_TOKEN,
      3000,
      '10'
    );
    console.log(`USDC needed: ${optimal.amount0}`);
    console.log(`WETH needed: ${optimal.amount1}\n`);

  } catch (error) {
    console.error('Error in main function:', error);
    
    // Provide helpful debugging information
    console.log('\n━━━ Debugging Information ━━━');
    console.log('1. Check if tokens exist on Base Sepolia:');
    console.log(`   USDC: ${USDC_TOKEN.address}`);
    console.log(`   WETH: ${WETH_TOKEN.address}`);
    console.log('2. Verify RPC endpoint is working');
    console.log('3. Check if the pool has been created on Base Sepolia');
    
    // If pool doesn't exist, try with different fee tiers
    try {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });
      
      console.log('\n━━━ Trying Different Fee Tiers ━━━');
      const feeTiers = [500, 3000, 10000];
      for (const fee of feeTiers) {
        try {
          const poolAddr = await getPoolAddress(client, USDC_TOKEN, WETH_TOKEN, fee);
          console.log(`✓ USDC/WETH ${fee/10000}% pool exists: ${poolAddr}`);
        } catch (e) {
          console.log(`✗ USDC/WETH ${fee/10000}% pool does not exist`);
        }
      }
    } catch (e) {
      console.log('Error checking fee tiers:', e);
    }
  }
}

// Export functions
export {
  calculateLiquidityPosition,
  getMintParams,
  calculateOptimalAmounts,
  getPoolAddress,
  USDC_TOKEN,
  WETH_TOKEN,
  NONFUNGIBLE_POSITION_MANAGER,
  WBTC_TOKEN,
  UNI_TOKEN,
};

export type { LiquidityParams, LiquidityPosition };

if (require.main === module) {
  main().catch(console.error);
}