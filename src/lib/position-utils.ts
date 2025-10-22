import { readContract } from 'wagmi/actions';
import { config as wagmiConfig } from "@/components/providers/WagmiProvider";
import ABIS, { CONTRACT_ADDRESSES } from '@/constants/abis';
import { formatUnits } from 'viem';

/**
 * Fetches detailed information about a specific Uniswap V3 position
 * @param positionId The NFT ID of the position
 * @returns Detailed position information
 */
export async function getPositionDetails(positionId: string | number) {
  try {
    // Convert positionId to bigint
    const tokenId = BigInt(positionId);
    
    // Call the leader terminal contract to get position details
    const positionDetails = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
      abi: ABIS.TribeLeaderTerminal,
      functionName: 'getPosition',
      args: [tokenId],
    });
    
    return positionDetails;
  } catch (error) {
    console.error(`Failed to fetch details for position #${positionId}:`, error);
    throw error;
  }
}

/**
 * Fetches fee information for a specific Uniswap V3 position
 * @param positionId The NFT ID of the position
 * @returns Fee information including uncollected amounts
 */
export async function getPositionFees(positionId: string | number) {
  try {
    // Convert positionId to bigint
    const tokenId = BigInt(positionId);
    
    // Call the leader terminal contract to get fee information
    const feeInfo = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
      abi: ABIS.TribeLeaderTerminal,
      functionName: 'getPositionFees',
      args: [tokenId],
    });
    
    return feeInfo;
  } catch (error) {
    console.error(`Failed to fetch fees for position #${positionId}:`, error);
    throw error;
  }
}

/**
 * Checks if a user can interact with a position (is owner or has permission)
 * @param positionId The NFT ID of the position
 * @param userAddress The address to check permissions for
 * @returns Boolean indicating if user can interact with position
 */
export async function canManagePosition(positionId: string | number, userAddress: string) {
  try {
    // Convert positionId to bigint
    const tokenId = BigInt(positionId);
    
    // Call the leader terminal contract to check permissions
    const canManage = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
      abi: ABIS.TribeLeaderTerminal,
      functionName: 'canManagePosition',
      args: [tokenId, userAddress as `0x${string}`],
    });
    
    return canManage;
  } catch (error) {
    console.error(`Failed to check permissions for position #${positionId}:`, error);
    return false;
  }
}