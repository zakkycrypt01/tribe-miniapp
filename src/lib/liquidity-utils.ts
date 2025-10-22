import { writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { config as wagmiConfig } from "@/components/providers/WagmiProvider";
import ABIS, { CONTRACT_ADDRESSES } from '@/constants/abis';

/**
 * Removes liquidity from a Uniswap V3 position via the Leader Terminal
 * @param positionId The NFT ID of the position
 * @param percentageToRemove Percentage of liquidity to remove (1-100)
 * @param recipient Address to receive tokens
 * @returns Transaction receipt
 */
export async function removeLiquidity(
  positionId: string | number,
  percentageToRemove: number,
  recipient: `0x${string}`
) {
  try {
    // Convert positionId to number if it's a string
    const tokenId = typeof positionId === 'string' ? Number(positionId) : positionId;
    
    // Calculate liquidity percentage (where 100% = 10000)
    const percentageBips = Math.min(Math.max(Math.floor(percentageToRemove * 100), 1), 10000);
    
    console.log(`Removing ${percentageToRemove}% (${percentageBips} bips) liquidity from position #${tokenId}`);
    
    const txHash = await writeContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
      abi: ABIS.TribeLeaderTerminal,
      functionName: 'removeLiquidityUniswapV3',
      args: [
        BigInt(tokenId),
        BigInt(percentageBips),
        recipient,
        // We use 0 for minimum amounts to match our earlier strategy
        0n, // amount0Min
        0n, // amount1Min
      ],
    });
    
    console.log('Remove liquidity transaction submitted:', txHash);
    
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
    console.log('Liquidity removed successfully. Receipt:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('Failed to remove liquidity:', error);
    throw error;
  }
}

/**
 * Collects fees from a Uniswap V3 position via the Leader Terminal
 * @param positionId The NFT ID of the position
 * @param recipient Address to receive fees
 * @returns Transaction receipt
 */
export async function collectFees(
  positionId: string | number,
  recipient: `0x${string}`
) {
  try {
    // Convert positionId to number if it's a string
    const tokenId = typeof positionId === 'string' ? Number(positionId) : positionId;
    
    console.log(`Collecting fees from position #${tokenId}`);
    
    const txHash = await writeContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
      abi: ABIS.TribeLeaderTerminal,
      functionName: 'collectFeesUniswapV3',
      args: [
        BigInt(tokenId),
        recipient,
      ],
    });
    
    console.log('Collect fees transaction submitted:', txHash);
    
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
    console.log('Fees collected successfully. Receipt:', receipt);
    
    return receipt;
  } catch (error) {
    console.error('Failed to collect fees:', error);
    throw error;
  }
}