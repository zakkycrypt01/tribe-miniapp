import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { readContract, readContracts } from 'wagmi/actions';
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
  // Store fetched token metadata to avoid repeated calls
  const [tokenMetadataCache, setTokenMetadataCache] = useState<Record<string, { 
    symbol: string, 
    name: string, 
    decimals: number, 
    iconUrl: string 
  }>>({});

  useEffect(() => {
    async function fetchPositions() {
      if (!isConnected || !address) {
        setPositions([]);
        setIsLoading(false);
        return;
      }
      
      // Initialize with hardcoded token metadata
      // Add our known tokens to the cache if they're not already there
      Object.keys(TOKEN_METADATA).forEach(address => {
        if (!tokenMetadataCache[address]) {
          setTokenMetadataCache(prev => ({
            ...prev,
            [address]: TOKEN_METADATA[address]
          }));
        }
      });
      
      try {
        setIsLoading(true);
        setError(null);
        const allPositions: LpPosition[] = [];

        // Check if user is a registered leader
        let isLeader = false;
        try {
          const leaderCheckResult = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
            abi: ABIS.TribeLeaderRegistry,
            functionName: 'isRegisteredLeader',
            args: [address as `0x${string}`]
          });
          isLeader = Boolean(leaderCheckResult);
        } catch (error) {
          console.warn('Error checking if user is a leader:', error);
        }

        // 1. Fetch leader positions if the user is a leader
        if (isLeader) {
          try {
            console.log('User is a registered leader, fetching leader positions...');
            const leaderPositionsResponse = await readContract(wagmiConfig, {
              address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
              abi: ABIS.TribeLeaderTerminal,
              functionName: 'getUserPositions',
              args: [address as `0x${string}`]
            });
            
            console.log('Raw leader positions:', leaderPositionsResponse);
            const leaderPositions = await formatPositionsResponse(leaderPositionsResponse, 'leader');
            allPositions.push(...leaderPositions);
          } catch (error) {
            console.error('Error fetching leader positions:', error);
          }
        }

        // 2. Get all registered leaders to check follower vaults
        let allLeaders: string[] = [];
        try {
          allLeaders = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
            abi: ABIS.TribeLeaderRegistry,
            functionName: 'getAllLeaders',
            args: []
          }) as string[];
          console.log(`Found ${allLeaders.length} registered leaders`);
        } catch (error) {
          console.error('Error fetching all leaders:', error);
        }

        // 3. Check if user has vaults for each leader
        if (allLeaders.length > 0) {
          const vaultFactory = CONTRACT_ADDRESSES.VAULT_FACTORY as `0x${string}`;
          
          // Create an array of contract read configurations - need to use specific typing for wagmi
          const vaultChecks = allLeaders.map(leader => ({
            address: vaultFactory,
            abi: ABIS.TribeVaultFactory as any, // Use type assertion to match wagmi's expected types
            functionName: 'followerVaults',
            args: [address as `0x${string}`, leader as `0x${string}`]
          }));
          
          // Execute all contract reads in parallel
          const vaultAddresses = await readContracts(wagmiConfig, {
            contracts: vaultChecks as any // Use type assertion to match wagmi's expected types
          });
          
          const validVaults = vaultAddresses
            .map((result, index) => {
              if (result.status === 'success' && result.result !== '0x0000000000000000000000000000000000000000') {
                return {
                  vaultAddress: result.result as string,
                  leader: allLeaders[index]
                };
              }
              return null;
            })
            .filter((vault): vault is { vaultAddress: string, leader: string } => vault !== null);
          
          console.log(`Found ${validVaults.length} follower vaults for user`);

          // 4. Fetch positions from each follower vault
          for (const vault of validVaults) {
            try {
              let positionCount = 0;
              let continueChecking = true;
              const vaultPositions: any[] = [];
              
              // Keep trying to fetch positions by index until we get an error
              while (continueChecking) {
                try {
                  const positionData = await readContract(wagmiConfig, {
                    address: vault.vaultAddress as `0x${string}`,
                    abi: ABIS.TribeCopyVault,
                    functionName: 'positions',
                    args: [positionCount]
                  });
                  
                  // Handle the result based on its structure
                  if (Array.isArray(positionData)) {
                    // If it's an array, extract the values in order based on the contract's return structure
                    const [protocol, token0, token1, liquidity, tokenId, isActive] = positionData;
                    vaultPositions.push({
                      protocol,
                      token0,
                      token1,
                      liquidity,
                      tokenId,
                      isActive,
                      leader: vault.leader,
                      vaultAddress: vault.vaultAddress
                    });
                  } else if (positionData && typeof positionData === 'object') {
                    // If it's already an object
                    vaultPositions.push({
                      ...Object(positionData),
                      leader: vault.leader,
                      vaultAddress: vault.vaultAddress
                    });
                  }
                  positionCount++;
                } catch (e) {
                  // No more positions found
                  continueChecking = false;
                }
              }
              
              console.log(`Found ${vaultPositions.length} positions in vault ${vault.vaultAddress}`);
              
              // Format and add vault positions
              const formattedVaultPositions = await formatPositionsResponse(vaultPositions, 'follower');
              allPositions.push(...formattedVaultPositions);
              
            } catch (vaultError) {
              console.error(`Error fetching positions for vault ${vault.vaultAddress}:`, vaultError);
            }
          }
        }

        // 5. As a backup, still fetch positions from the Leader Terminal
        // This may include both leader and follower positions depending on contract implementation
        try {
          const terminalPositionsResponse = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESSES.LEADER_TERMINAL as `0x${string}`,
            abi: ABIS.TribeLeaderTerminal,
            functionName: 'getUserPositions',
            args: [address as `0x${string}`]
          });
          
          console.log('Raw terminal positions:', terminalPositionsResponse);
          
          // Check if we already have these positions by ID to avoid duplicates
          const existingIds = new Set(allPositions.map(pos => pos.id));
          const terminalPositions = await formatPositionsResponse(terminalPositionsResponse, 'terminal');
          const uniqueTerminalPositions = terminalPositions.filter(pos => !existingIds.has(pos.id));
          
          if (uniqueTerminalPositions.length > 0) {
            console.log(`Adding ${uniqueTerminalPositions.length} unique positions from terminal`);
            allPositions.push(...uniqueTerminalPositions);
          }
        } catch (error) {
          console.error('Error fetching terminal positions:', error);
        }
        
        // Token metadata cache is already updated via setTokenMetadataCache calls
        setPositions(allPositions);
      } catch (err) {
        console.error('Error fetching LP positions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch LP positions'));
      } finally {
        setIsLoading(false);
      }
    }
    
    // Helper function to format positions response into LpPosition objects
    async function formatPositionsResponse(positionsResponse: any, source: 'leader' | 'follower' | 'terminal'): Promise<LpPosition[]> {
      const formattedPositions: LpPosition[] = [];
      
      if (!positionsResponse || !Array.isArray(positionsResponse)) {
        return formattedPositions;
      }
      
      console.log(`Processing ${positionsResponse.length} position(s) from ${source}`);
      
      for (let i = 0; i < positionsResponse.length; i++) {
        const position = positionsResponse[i];
        
        if (!position || typeof position !== 'object') {
          console.warn(`Skipping position at index ${i}: Invalid structure`);
          continue;
        }
        
        try {
          // Normalize token addresses - they might be in different fields based on source
          const token0Address = (position.token0 ? String(position.token0) : undefined)?.toLowerCase();
          const token1Address = (position.token1 ? String(position.token1) : undefined)?.toLowerCase();
          
          if (!token0Address || !token1Address) {
            console.warn(`Skipping position at index ${i}: Missing token addresses`);
            continue;
          }
          
          // Check cache first, then fallback to defaults
          let token0Metadata = tokenMetadataCache[token0Address] || {
            symbol: 'Unknown',
            name: 'Unknown Token',
            decimals: 18,
            iconUrl: '/assets/images/tokens/eth.png'
          };
          
          let token1Metadata = tokenMetadataCache[token1Address] || {
            symbol: 'Unknown',
            name: 'Unknown Token',
            decimals: 18,
            iconUrl: '/assets/images/tokens/eth.png'
          };
          
          // If token metadata not in cache, try to fetch it
          if (!tokenMetadataCache[token0Address]) {
            try {
              const fetchedMetadata0 = await fetchTokenMetadata(token0Address, publicClient);
              if (fetchedMetadata0) {
                token0Metadata = fetchedMetadata0;
                // Update metadata in parent scope
                setTokenMetadataCache(prev => ({
                  ...prev,
                  [token0Address]: fetchedMetadata0
                }));
              }
            } catch (err) {
              console.warn(`Could not fetch metadata for token0 ${token0Address}:`, err);
            }
          }
          
          if (!tokenMetadataCache[token1Address]) {
            try {
              const fetchedMetadata1 = await fetchTokenMetadata(token1Address, publicClient);
              if (fetchedMetadata1) {
                token1Metadata = fetchedMetadata1;
                // Update metadata in parent scope
                setTokenMetadataCache(prev => ({
                  ...prev,
                  [token1Address]: fetchedMetadata1
                }));
              }
            } catch (err) {
              console.warn(`Could not fetch metadata for token1 ${token1Address}:`, err);
            }
          }
          
          // Generate a reliable ID - preference order: nftId > tokenId > position index
          const positionId = position.nftId ? 
            String(position.nftId) : 
            (position.tokenId ? 
              String(position.tokenId) : 
              `${source}-position-${i}`);
          
          const formattedPosition: LpPosition = {
            id: positionId,
            pair: [
              {
                id: token0Address,
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
                id: token1Address,
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
            protocol: position.protocol === 'Aerodrome' ? 'Aerodrome' : 'Uniswap V3',
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
          console.log(`Successfully processed position from ${source}: ${formattedPosition.id} (${formattedPosition.pair[0].symbol}/${formattedPosition.pair[1].symbol})`);
        } catch (positionError) {
          console.error(`Error processing position at index ${i}:`, positionError);
          console.error('Position data:', JSON.stringify(position, null, 2));
        }
      }
      
      return formattedPositions;
    }

    fetchPositions();
  }, [address, isConnected]);

  // Function to refresh positions
  // Function to refresh positions
  const refreshPositions = () => {
    if (isConnected && address) {
      // This will trigger the useEffect to run again
      setIsLoading(true);
      // Force re-render which will trigger useEffect
      setPositions([]); 
    }
  };

  return { 
    positions, 
    isLoading, 
    error,
    refreshPositions
  };
}

// Helper function to try and fetch token metadata from the ERC20 contract
async function fetchTokenMetadata(
  tokenAddress: string, 
  publicClient: any
): Promise<{ symbol: string, name: string, decimals: number, iconUrl: string } | null> {
  if (!tokenAddress) return null;
  
  const erc20Abi = [
    {
      "constant": true,
      "inputs": [],
      "name": "name",
      "outputs": [{ "name": "", "type": "string" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "symbol",
      "outputs": [{ "name": "", "type": "string" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [],
      "name": "decimals",
      "outputs": [{ "name": "", "type": "uint8" }],
      "type": "function"
    }
  ];
  
  try {
    // Try to fetch token metadata
    const [nameResult, symbolResult, decimalsResult] = await Promise.all([
      readContract(wagmiConfig, {
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'name'
      }),
      readContract(wagmiConfig, {
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol'
      }),
      readContract(wagmiConfig, {
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals'
      })
    ]);
    
    // Use generic token icon as fallback
    const iconUrl = '/assets/images/tokens/eth.png';
    
    return {
      name: String(nameResult) || 'Unknown Token',
      symbol: String(symbolResult) || 'UNKNOWN',
      decimals: Number(decimalsResult) || 18,
      iconUrl
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for token ${tokenAddress}:`, error);
    return null;
  }
}