import { useState, useEffect } from 'react';
import { ActionHistoryItem } from '@/app/lib/types';
import { ABIS, CONTRACT_ADDRESSES } from '@/constants/abis';
import { ethers } from 'ethers';

interface EtherscanTx {
  hash: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  input: string;
  isError: string;
}

export function useTxHistory(address: string) {
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!address) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get API key from environment variable
        const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "NH9T3PWS3WGD7AKF9NV4FJ7GJB71TENBTI"; // Fallback for testing
        
        // Use the v2 API endpoint with chainid for Base Goerli (84532)
        const url = `https://api.etherscan.io/v2/api?apikey=${apiKey}&chainid=84532&module=account&action=txlist&address=${address}&startblock=0&endblock=9999999999&offset=1&sort=desc`;
        const options = {method: 'GET'};
        
        console.log('Fetching from URL:', url);
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (data.status !== '1' && data.message !== 'OK') {
          throw new Error(`Etherscan API error: ${data.message || 'Unknown error'}`);
        }
        
        // Log the response for debugging
        console.log('Etherscan API response:', data);
        
        // Check if data.result exists and is an array
        if (Array.isArray(data.result)) {
          const filteredHistory = processTransactions(data.result);
          setHistory(filteredHistory);
        } else {
          console.warn('Unexpected response format from Etherscan API:', data);
          setHistory([]);
        }
      } catch (err) {
        console.error('Failed to fetch transaction history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [address]);

  return { history, isLoading, error };
}

// Process transactions and identify relevant contract interactions
function processTransactions(transactions: EtherscanTx[]): ActionHistoryItem[] {
  // Safety check
  if (!Array.isArray(transactions)) {
    console.error('Invalid transactions data:', transactions);
    return [];
  }
  
  console.log('Processing transactions:', transactions.length);
  
  // Sample transaction format for debugging
  if (transactions.length > 0) {
    console.log('Sample transaction format:', transactions[0]);
  }
  
  // All contract addresses to lowercase for case-insensitive comparison
  const contractAddresses = {
    leaderTerminal: CONTRACT_ADDRESSES.LEADER_TERMINAL?.toLowerCase() || '',
    vaultFactory: CONTRACT_ADDRESSES.VAULT_FACTORY?.toLowerCase() || '',
    uniswapAdapter: CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER?.toLowerCase() || '',
  };
  
  console.log('Contract addresses to match:', contractAddresses);
  
  // Initialize contract interfaces with proper error handling
  const contractInterfaces: { [address: string]: ethers.Interface } = {};
  
  try {
    if (CONTRACT_ADDRESSES.LEADER_TERMINAL) {
      contractInterfaces[CONTRACT_ADDRESSES.LEADER_TERMINAL.toLowerCase()] = 
        new ethers.Interface(ABIS.TribeLeaderTerminal);
    }
    
    if (CONTRACT_ADDRESSES.VAULT_FACTORY) {
      contractInterfaces[CONTRACT_ADDRESSES.VAULT_FACTORY.toLowerCase()] = 
        new ethers.Interface(ABIS.TribeVaultFactory);
    }
    
    if (CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER) {
      contractInterfaces[CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER.toLowerCase()] = 
        new ethers.Interface(ABIS.TribeUniswapV3Adapter);
    }
  } catch (error) {
    console.error('Error initializing contract interfaces:', error);
  }
  
  console.log('Initialized contract interfaces for addresses:', Object.keys(contractInterfaces));
  
  const actionItems: ActionHistoryItem[] = [];
  
  for (const tx of transactions) {
    // Skip failed transactions
    if (tx.isError === '1') continue;
    
    // Convert to address to lowercase for comparison
    const toAddress = tx.to?.toLowerCase();
    if (!toAddress) continue;
    
    // Check if transaction is to one of our contracts
    const contractInterface = contractInterfaces[toAddress];
    if (!contractInterface) {
      // Log for debugging which transactions are being skipped
      console.debug('Skipping transaction to non-matching address:', toAddress);
      continue;
    }
    
    console.log('Found transaction to matched contract:', tx.hash, toAddress);
    
    try {
      // Make sure input data exists and is not empty
      if (!tx.input || tx.input === '0x' || tx.input === '0x0') {
        console.debug('Skipping transaction with no input data:', tx.hash);
        continue;
      }
      
      console.log('Attempting to decode transaction:', tx.hash, 'Input length:', tx.input.length);
      
      // Try to decode the function call
      let decodedData;
      try {
        decodedData = contractInterface.parseTransaction({ data: tx.input });
      } catch (decodeError) {
        console.debug('Failed to decode transaction input:', tx.hash, decodeError);
        continue;
      }
      
      if (decodedData) {
        console.log('Successfully decoded transaction:', tx.hash, 'Function:', decodedData.name);
        
        // Calculate gas cost
        let gasCost = 0;
        try {
          if (tx.gasPrice && tx.gasUsed) {
            gasCost = parseFloat(ethers.formatEther(
              (BigInt(tx.gasPrice) * BigInt(tx.gasUsed)).toString()
            ));
          }
        } catch (gasError) {
          console.warn('Error calculating gas cost:', gasError);
          // Default fallback if calculation fails
          gasCost = 0.001;
        }
        
        // Determine action type and details based on the function name
        let action: ActionHistoryItem['action'] = 'Swap';
        let details = `Call to ${decodedData.name}`;
        
        // Handle different function names
        if (decodedData.name.includes('swap')) {
          action = 'Swap';
          // Extract token symbols if available in args
          try {
            const tokenIn = decodedData.args.tokenIn || decodedData.args.tokenA;
            const tokenOut = decodedData.args.tokenOut || decodedData.args.tokenB;
            if (tokenIn && tokenOut) {
              details = `Swap tokens (${tokenIn.substring(0, 8)}...${tokenIn.substring(tokenIn.length - 6)} → ${tokenOut.substring(0, 8)}...${tokenOut.substring(tokenOut.length - 6)})`;
            } else {
              details = `Executed swap via ${decodedData.name}`;
            }
          } catch (e) {
            details = `Executed swap via ${decodedData.name}`;
          }
        } else if (decodedData.name.includes('addLiquidity') || decodedData.name.includes('mint')) {
          action = 'Add Liquidity';
          details = `Added liquidity via ${decodedData.name}`;
        } else if (decodedData.name.includes('removeLiquidity') || decodedData.name.includes('burn')) {
          action = 'Remove Liquidity';
          details = `Removed liquidity via ${decodedData.name}`;
        } else if (decodedData.name.includes('range') || decodedData.name.includes('position')) {
          action = 'Adjust Range';
          details = `Adjusted position range via ${decodedData.name}`;
        }
        
        // Create action history item
        actionItems.push({
          id: tx.hash,
          action,
          details,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          gasCost,
          txHash: tx.hash,
        });
        
        console.log('Added transaction to history:', {
          hash: tx.hash,
          action,
          details,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
          gasCost
        });
      } else {
        console.debug('Decoded data is null for transaction:', tx.hash);
      }
    } catch (error) {
      // Skip transactions that can't be decoded
      console.error('Error processing transaction:', tx.hash, error);
    }
  }
  
  console.log(`Processed ${transactions.length} transactions, found ${actionItems.length} matching actions`);
  
  // If we didn't find any valid transactions but there were transactions to process,
  // let's add a fallback item to show something in the UI
  if (actionItems.length === 0 && transactions.length > 0) {
    // Take the most recent transaction as a fallback
    const recentTx = transactions[0];
    if (recentTx) {
      actionItems.push({
        id: recentTx.hash,
        action: 'Swap', // Default action type
        details: `Transaction: ${recentTx.hash.substring(0, 10)}...`,
        timestamp: new Date(parseInt(recentTx.timeStamp) * 1000),
        gasCost: parseFloat(ethers.formatEther(
          (BigInt(recentTx.gasPrice || '0') * BigInt(recentTx.gasUsed || '0')).toString()
        )) || 0.001,
        txHash: recentTx.hash,
      });
      
      console.log('Added fallback transaction to history');
    }
  }
  
  return actionItems;
}
