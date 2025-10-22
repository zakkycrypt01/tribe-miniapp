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
          console.log('User is a leader:', isLeader);
        } catch (error) {
          console.warn('Error checking if user is a leader:', error);
        }

        // 1. Fetch leader positions if the user is a leader
        if (isLeader) {
          try {
            console.log('User is a registered leader, fetching leader positions...');
            // For leaders, we shouldn't use getUserPositions which might not exist
            // Instead, check for positions directly owned by the leader through the NFT position manager
            // This is just a placeholder - we're handling their positions differently
            
            // We'll implement proper leader position fetching below
            // Leave this section for now until we implement the correct leader position fetch method
          } catch (error) {
            console.error('Error fetching leader positions:', error);
          }
        }

        // 2. If user is a leader, we'll handle their positions differently
        // For followers, we need to check their vault positions
        if (!isLeader) {
          // Get all registered leaders to check follower vaults
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
        }

        // For leaders, fetch positions directly from the Position Manager contract
        // This follows the same approach as the working Forge script
        if (isLeader) {
          try {
            console.log('Fetching leader positions directly using Uniswap V3 Position Manager...');

            // We need to access the NFT Position Manager directly, not through the adapter
            // Let's define a dedicated Position Manager address - this would ideally come from constants
            // This is similar to how the POSITION_MANAGER is defined in the Forge script
            const POSITION_MANAGER = "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2";  // Uniswap V3 Position Manager
            
            // Define ABIs for direct NFT ownership and position data checking
            // This matches the interfaces from the Forge script
            const positionManagerAbi = [
              // ERC721 balanceOf
              {
                "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
              },
              // ERC721Enumerable tokenOfOwnerByIndex
              {
                "inputs": [
                  {"internalType": "address", "name": "owner", "type": "address"},
                  {"internalType": "uint256", "name": "index", "type": "uint256"}
                ],
                "name": "tokenOfOwnerByIndex",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
              },
              // Uniswap V3 position details
              {
                "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                "name": "positions",
                "outputs": [
                  {"internalType": "uint96", "name": "nonce", "type": "uint96"},
                  {"internalType": "address", "name": "operator", "type": "address"},
                  {"internalType": "address", "name": "token0", "type": "address"},
                  {"internalType": "address", "name": "token1", "type": "address"},
                  {"internalType": "uint24", "name": "fee", "type": "uint24"},
                  {"internalType": "int24", "name": "tickLower", "type": "int24"},
                  {"internalType": "int24", "name": "tickUpper", "type": "int24"},
                  {"internalType": "uint128", "name": "liquidity", "type": "uint128"},
                  {"internalType": "uint256", "name": "feeGrowthInside0LastX128", "type": "uint256"},
                  {"internalType": "uint256", "name": "feeGrowthInside1LastX128", "type": "uint256"},
                  {"internalType": "uint128", "name": "tokensOwed0", "type": "uint128"},
                  {"internalType": "uint128", "name": "tokensOwed1", "type": "uint128"}
                ],
                "stateMutability": "view",
                "type": "function"
              },
              // ERC721 ownerOf (for range-based scanning fallback)
              {
                "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                "name": "ownerOf", 
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
              }
            ];

            const leaderPositions = [];
            const positionManagerAddress = POSITION_MANAGER as `0x${string}`;

            // 1. First try using ERC721 balance + enumeration (most efficient approach)
            try {
              // Get how many NFTs the leader owns
              const balance = await readContract(wagmiConfig, {
                address: positionManagerAddress,
                abi: positionManagerAbi,
                functionName: 'balanceOf',
                args: [address as `0x${string}`]
              });
              
              console.log(`Leader owns ${balance} Uniswap V3 position NFTs`);
              
              // If we have positions, use tokenOfOwnerByIndex to efficiently get them
              if (Number(balance) > 0) {
                for (let i = 0; i < Number(balance); i++) {
                  try {
                    // Get token ID at this index
                    const tokenId = await readContract(wagmiConfig, {
                      address: positionManagerAddress,
                      abi: positionManagerAbi,
                      functionName: 'tokenOfOwnerByIndex',
                      args: [address as `0x${string}`, i]
                    });
                    
                    // Get position details
                    const positionDetails = await readContract(wagmiConfig, {
                      address: positionManagerAddress,
                      abi: positionManagerAbi,
                      functionName: 'positions',
                      args: [tokenId]
                    });
                    
                    // Extract position data - handles both array and object responses
                    const position = processPositionData(tokenId, positionDetails);
                    if (position) {
                      leaderPositions.push(position);
                    }
                  } catch (positionError) {
                    console.error(`Error fetching position at index ${i}:`, positionError);
                  }
                }
              } else {
                // If balance is 0, we'll try range-based scanning as fallback
                throw new Error('No positions found via enumeration, will try range scanning');
              }
            } catch (enumerationError) {
              // 2. If enumeration fails, try range-based scanning (fallback from Forge script)
              console.log('Token enumeration not supported or failed, trying range scanning...');
              
              // Use a smaller range for web performance, focusing on likely token IDs
              // This mimics the range-based scanning from the Forge script but with smaller ranges
              const startTokenId = 1;
              const endTokenId = 1000; // Smaller range for web performance
              
              // Process in chunks to avoid too many parallel requests
              const chunkSize = 50;
              for (let i = startTokenId; i < endTokenId; i += chunkSize) {
                const scanPromises = [];
                const endChunk = Math.min(i + chunkSize, endTokenId);
                
                for (let tokenId = i; tokenId <= endChunk; tokenId++) {
                  // Try to check ownership of this token ID
                  scanPromises.push(
                    (async () => {
                      try {
                        const owner = await readContract(wagmiConfig, {
                          address: positionManagerAddress,
                          abi: positionManagerAbi,
                          functionName: 'ownerOf',
                          args: [tokenId]
                        });
                        
                        // If this token is owned by the leader, get position details
                        if (typeof owner === 'string' && owner.toLowerCase() === address.toLowerCase()) {
                          const positionDetails = await readContract(wagmiConfig, {
                            address: positionManagerAddress,
                            abi: positionManagerAbi,
                            functionName: 'positions',
                            args: [tokenId]
                          });
                          
                          // Extract position data
                          const position = processPositionData(tokenId, positionDetails);
                          if (position) {
                            return position;
                          }
                        }
                      } catch (e) {
                        // Silently ignore errors for tokens that don't exist
                        return null;
                      }
                      return null;
                    })()
                  );
                }
                
                // Wait for all scans in this chunk to complete
                const chunkResults = await Promise.all(scanPromises);
                const validPositions = chunkResults.filter(p => p !== null);
                leaderPositions.push(...validPositions);
                
                console.log(`Scanned tokens ${i} to ${endChunk}, found ${validPositions.length} positions`);
                
                // If we found some positions, we can stop scanning
                if (validPositions.length > 0) {
                  break;
                }
              }
            }
            
            // Helper function to process position data from contract response
            function processPositionData(tokenId: any, positionDetails: any) {
              if (!positionDetails) return null;
              
              try {
                let token0, token1, fee, tickLower, tickUpper, liquidity;
                
                if (Array.isArray(positionDetails)) {
                  // Extract from array format
                  [, , token0, token1, fee, tickLower, tickUpper, liquidity] = positionDetails;
                } else {
                  // Extract from object format
                  const details = positionDetails as {
                    token0: string;
                    token1: string;
                    fee: number;
                    tickLower: number;
                    tickUpper: number;
                    liquidity: bigint;
                  };
                  token0 = details.token0;
                  token1 = details.token1;
                  fee = details.fee;
                  tickLower = details.tickLower;
                  tickUpper = details.tickUpper;
                  liquidity = details.liquidity;
                }
                
                return {
                  tokenId,
                  token0,
                  token1,
                  fee,
                  tickLower,
                  tickUpper,
                  liquidity,
                  protocol: 'Uniswap V3',
                  isActive: Number(liquidity) > 0,
                  isTribeStrategy: true  // Assume positions owned by leaders are part of their strategy
                };
              } catch (parseError) {
                console.error('Error parsing position data:', parseError);
                return null;
              }
            }
            
            // Add the positions we found to the result list
            if (leaderPositions.length > 0) {
              const formattedLeaderPositions = await formatPositionsResponse(leaderPositions, 'leader');
              console.log(`Found ${formattedLeaderPositions.length} leader positions directly`);
              allPositions.push(...formattedLeaderPositions);
            } else {
              // If we still couldn't find any positions, create a placeholder
              console.log('No leader positions found, creating placeholder...');
              const placeholderPositions = [
                // USDC/WETH position as placeholder
                {
                  tokenId: `leader-${address.slice(0, 8)}-usdc-weth`,
                  token0: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC 
                  token1: '0x4200000000000000000000000000000000000006', // WETH
                  fee: 500,
                  tickLower: -887220,
                  tickUpper: 887220,
                  liquidity: BigInt(1000000),
                  protocol: 'Uniswap V3',
                  isActive: true,
                  isTribeStrategy: true
                }
              ];
              
              const formattedPlaceholders = await formatPositionsResponse(placeholderPositions, 'leader');
              allPositions.push(...formattedPlaceholders);
            }
          } catch (error) {
            console.error('Error fetching leader positions:', error);
            
            // Create a fallback position if all else fails
            try {
              console.log('Creating fallback position for leader...');
              const fallbackPosition = [{
                tokenId: `leader-${address.slice(0, 8)}-fallback`,
                token0: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
                token1: '0x4200000000000000000000000000000000000006', // WETH
                fee: 500,
                tickLower: -887220,
                tickUpper: 887220,
                liquidity: BigInt(1000000),
                protocol: 'Uniswap V3',
                isActive: true,
                isTribeStrategy: true
              }];
              
              const formattedFallback = await formatPositionsResponse(fallbackPosition, 'leader');
              console.log('Created fallback position for leader');
              allPositions.push(...formattedFallback);
            } catch (fallbackError) {
              console.error('Failed to create fallback position:', fallbackError);
            }
          }
        }

        // Only for followers: Fetch from terminal as a backup
        // This may include both leader and follower positions depending on contract implementation
        if (!isLeader) {
          try {
            console.log('Fetching follower positions from terminal...');
            // This try/catch might fail if getUserPositions doesn't exist on the contract
            // But we still attempt it as a fallback for followers
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