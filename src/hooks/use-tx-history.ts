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
  
  const contractInterfaces: { [address: string]: ethers.Interface } = {
    [CONTRACT_ADDRESSES.LEADER_TERMINAL]: new ethers.Interface(ABIS.TribeLeaderTerminal),
    [CONTRACT_ADDRESSES.VAULT_FACTORY]: new ethers.Interface(ABIS.TribeVaultFactory),
    [CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER]: new ethers.Interface(ABIS.TribeUniswapV3Adapter),
  };
  
  const actionItems: ActionHistoryItem[] = [];
  
  for (const tx of transactions) {
    // Skip failed transactions
    if (tx.isError === '1') continue;
    
    // Check if transaction is to one of our contracts
    const contractInterface = contractInterfaces[tx.to.toLowerCase()];
    if (!contractInterface) continue;
    
    try {
      // Try to decode the function call
      const decodedData = contractInterface.parseTransaction({ data: tx.input });
      
      if (decodedData) {
        const gasCost = parseFloat(ethers.formatEther(
          (BigInt(tx.gasPrice) * BigInt(tx.gasUsed)).toString()
        ));
        
        // Determine action type and details based on the function name
        let action: ActionHistoryItem['action'] = 'Swap';
        let details = 'Unknown action';
        
        // Handle different function names
        if (decodedData.name.includes('swap')) {
          action = 'Swap';
          // Extract token symbols if available in args
          const tokenIn = decodedData.args.tokenIn || decodedData.args.tokenA;
          const tokenOut = decodedData.args.tokenOut || decodedData.args.tokenB;
          if (tokenIn && tokenOut) {
            details = `Swap tokens`;
          } else {
            details = `Executed swap`;
          }
        } else if (decodedData.name.includes('addLiquidity') || decodedData.name.includes('mint')) {
          action = 'Add Liquidity';
          details = `Added liquidity`;
        } else if (decodedData.name.includes('removeLiquidity') || decodedData.name.includes('burn')) {
          action = 'Remove Liquidity';
          details = `Removed liquidity`;
        } else if (decodedData.name.includes('range') || decodedData.name.includes('position')) {
          action = 'Adjust Range';
          details = `Adjusted position range`;
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
      }
    } catch (error) {
      // Skip transactions that can't be decoded
      console.debug('Could not decode transaction:', tx.hash, error);
    }
  }
  
  return actionItems;
}
