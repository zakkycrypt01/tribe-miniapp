import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { formatUnits } from 'viem';
import ABIS, { CONTRACT_ADDRESSES } from '@/constants/abis';
import type { LpPosition } from '@/app/lib/types';
import { config as wagmiConfig } from '@/components/providers/WagmiProvider';

const TOKEN_METADATA: Record<string, { symbol: string, name: string, decimals: number, iconUrl: string }> = {
  '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUrl: '/assets/images/tokens/usdc.png'
  },
  '0x4200000000000000000000000000000000000006': {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    iconUrl: '/assets/images/tokens/eth.png'
  },
  '0xcbB7C0006F23900c38EB856149F799620fcb8A4a': {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    decimals: 8,
    iconUrl: '/assets/images/tokens/wbtc.png'
  },
  '0xB62b54F9b13F3bE72A65117a705c930e42563ab4': {
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    iconUrl: '/assets/images/tokens/uni.png'
  }
};

export function useLpPositions() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [positions, setPositions] = useState<LpPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchPositions() {
      if (!isConnected || !address) {
        setPositions([]);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);

        let userPositionsResponse;
        try {
          userPositionsResponse = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
            abi: ABIS.TribeLeaderTerminal,
            functionName: 'getUserPositions',
            args: [address as `0x${string}`]
          });
          
          console.log('Raw user positions:', userPositionsResponse);
        } catch (contractError) {
          console.error('Error calling getUserPositions:', contractError);
          throw new Error('Failed to fetch positions from smart contract');
        }
        
        const formattedPositions: LpPosition[] = [];
        
        if (userPositionsResponse && Array.isArray(userPositionsResponse)) {
          console.log(`Processing ${userPositionsResponse.length} position(s)`);
          for (let i = 0; i < userPositionsResponse.length; i++) {
            const position = userPositionsResponse[i];
            
            if (!position || typeof position !== 'object') {
              console.warn(`Skipping position at index ${i}: Invalid structure`);
              continue;
            }
            
            try {
              const token0Address = position.token0 ? String(position.token0).toLowerCase() : undefined;
              const token1Address = position.token1 ? String(position.token1).toLowerCase() : undefined;
              
              const token0Metadata = token0Address && TOKEN_METADATA[token0Address] ? TOKEN_METADATA[token0Address] : {
                symbol: 'Unknown',
                name: 'Unknown Token',
                decimals: 18,
                iconUrl: '/assets/images/tokens/eth.png'
              };
              
              const token1Metadata = token1Address && TOKEN_METADATA[token1Address] ? TOKEN_METADATA[token1Address] : {
                symbol: 'Unknown',
                name: 'Unknown Token',
                decimals: 18,
                iconUrl: '/assets/images/tokens/eth.png'
              };
              
              const formattedPosition: LpPosition = {
                id: position.nftId ? String(position.nftId) : `position-${i}`,
                pair: [
                  {
                    id: token0Address || `token0-${i}`,
                    symbol: token0Metadata.symbol,
                    name: token0Metadata.name,
                    icon: {
                      id: `token-${token0Metadata.symbol.toLowerCase()}`,
                      description: `${token0Metadata.name} Icon`,
                      imageUrl: token0Metadata.iconUrl,
                      imageHint: token0Metadata.symbol
                    }
                  },
                  {
                    id: token1Address || `token1-${i}`,
                    symbol: token1Metadata.symbol,
                    name: token1Metadata.name,
                    icon: {
                      id: `token-${token1Metadata.symbol.toLowerCase()}`,
                      description: `${token1Metadata.name} Icon`,
                      imageUrl: token1Metadata.iconUrl,
                      imageHint: token1Metadata.symbol
                    }
                  }
                ],
                protocol: 'Uniswap V3',
                value: position.value ? parseFloat(formatUnits(BigInt(String(position.value)), 18)) : 0,
                isTribeStrategy: !!position.isTribeStrategy,
                range: (position.tickLower !== undefined && 
                       position.tickUpper !== undefined && 
                       position.currentTick !== undefined) ? {
                  inRange: Number(position.currentTick) >= Number(position.tickLower) && 
                           Number(position.currentTick) <= Number(position.tickUpper),
                  min: Number(position.tickLower),
                  max: Number(position.tickUpper)
                } : undefined
              };
              
              formattedPositions.push(formattedPosition);
              console.log(`Successfully processed position: ${formattedPosition.id} (${formattedPosition.pair[0].symbol}/${formattedPosition.pair[1].symbol})`);
            } catch (positionError) {
              console.error(`Error processing position at index ${i}:`, positionError);
              console.error('Position data:', JSON.stringify(position, null, 2));
            }
          }
        }
        
        setPositions(formattedPositions);
      } catch (err) {
        console.error('Error fetching LP positions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch LP positions'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPositions();
  }, [address, isConnected]);

  return { positions, isLoading, error };
}