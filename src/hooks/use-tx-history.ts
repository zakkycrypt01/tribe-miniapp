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
  functionName?: string; // Optional field that might be present in the API response
  methodId?: string;     // Method ID signature
  blockNumber?: string;  // Block number where the transaction was mined
}

export function useTxHistory(address: string) {
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    const fetchTransactionHistory = async () => {
      if (!address) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Get API key from environment variable
        const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "NH9T3PWS3WGD7AKF9NV4FJ7GJB71TENBTI"; // Fallback for testing
        
        // Use the v2 API endpoint with chainid for Base Goerli (84532)
        const url = `https://api.etherscan.io/v2/api?apikey=${apiKey}&chainid=84532&module=account&action=txlist&address=${address}&startblock=0&endblock=9999999999&offset=50&sort=desc`;
        const options = {method: 'GET'};
        
        console.log('Fetching from URL:', url);
        const response = await fetch(url, options);
        const data = await response.json();
        
        // We consider both status "1" and message "OK" as successful responses
        if (data.status !== '1' && data.message !== 'OK') {
          throw new Error(`Etherscan API error: ${data.message || 'Unknown error'}`);
        }
        
        // Log the response for debugging
        console.log('Etherscan API response:', data);
        
        // Store the raw data for components to access if needed
        setRawData(data);
        
        // Check if data.result exists and is an array
        if (Array.isArray(data.result)) {
          const filteredHistory = processTransactions(data.result);
          console.log(`Processed ${filteredHistory.length} transactions from ${data.result.length} results`);
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

  return { history, isLoading, error, rawData };
}

// Process transactions and identify relevant contract interactions
function processTransactions(transactions: EtherscanTx[]): ActionHistoryItem[] {
  // Safety check
  if (!Array.isArray(transactions)) {
    console.error('Invalid transactions data:', transactions);
    return [];
  }
  
  console.log('Processing', transactions.length, 'transactions');
  
  // For demonstration purposes, let's convert all transactions to ActionHistoryItem
  // Later we can filter by specific contracts or function calls
  
  const contractInterfaces: { [address: string]: ethers.Interface } = {
    [CONTRACT_ADDRESSES.LEADER_TERMINAL.toLowerCase()]: new ethers.Interface(ABIS.TribeLeaderTerminal),
    [CONTRACT_ADDRESSES.VAULT_FACTORY.toLowerCase()]: new ethers.Interface(ABIS.TribeVaultFactory),
    [CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER.toLowerCase()]: new ethers.Interface(ABIS.TribeUniswapV3Adapter),
  };
  
  const actionItems: ActionHistoryItem[] = [];
  
  // Process transactions (limit to 50 for UI performance)
  const transactionsToProcess = transactions.slice(0, 50);
  
  console.log('Processing transactions:', transactionsToProcess.length);
  
  for (const tx of transactionsToProcess) {
    // Skip failed transactions
    if (tx.isError === '1') continue;
    
    try {
      // Default to showing transaction as a Swap
      let action: ActionHistoryItem['action'] = 'Swap';
      let details = 'Transaction';
      
      // First try to get transaction details from the "functionName" field if available
      if (tx.functionName) {
        details = tx.functionName;
        
        // Classify based on function name keywords
        if (details.toLowerCase().includes('swap')) {
          action = 'Swap';
          details = `Swap (${details})`;
        } else if (details.toLowerCase().includes('add') || details.toLowerCase().includes('mint') || 
                  details.toLowerCase().includes('provide')) {
          action = 'Add Liquidity';
          details = `Add Liquidity (${details})`;
        } else if (details.toLowerCase().includes('remove') || details.toLowerCase().includes('burn') ||
                  details.toLowerCase().includes('withdraw')) {
          action = 'Remove Liquidity';
          details = `Remove Liquidity (${details})`;
        } else if (details.toLowerCase().includes('range') || details.toLowerCase().includes('position')) {
          action = 'Adjust Range';
          details = `Adjust Range (${details})`;
        }
      }
      
      // If there's no function name or it's generic, try to decode using ABIs
      else if (tx.to) {
        const contractInterface = contractInterfaces[tx.to?.toLowerCase()];
        
        if (contractInterface && tx.input && tx.input !== '0x') {
          try {
            // Try to decode the function call
            const decodedData = contractInterface.parseTransaction({ data: tx.input });
            
            if (decodedData) {
              // Determine action type and details based on the function name
              details = decodedData.name || 'Contract interaction';
              
              // Handle different function names
              if (decodedData.name?.includes('swap')) {
                action = 'Swap';
                details = `Swap`;
              } else if (decodedData.name?.includes('addLiquidity') || decodedData.name?.includes('mint')) {
                action = 'Add Liquidity';
                details = `Added liquidity`;
              } else if (decodedData.name?.includes('removeLiquidity') || decodedData.name?.includes('burn')) {
                action = 'Remove Liquidity';
                details = `Removed liquidity`;
              } else if (decodedData.name?.includes('range') || decodedData.name?.includes('position')) {
                action = 'Adjust Range';
                details = `Adjusted position range`;
              }
            }
          } catch (decodeError) {
            console.debug('Could not decode transaction input:', tx.hash, decodeError);
          }
        }
      }
      
      // For ETH transfers or transactions we can't decode
      if (tx.value && tx.value !== '0' && !details.includes('Swap') && !details.includes('Liquidity')) {
        const valueInEth = parseFloat(ethers.formatEther(tx.value));
        if (valueInEth > 0) {
          action = 'Swap';
          details = `Transfer ${valueInEth.toFixed(6)} ETH`;
        }
      }
      
      // Calculate gas cost
      const gasCost = parseFloat(ethers.formatEther(
        (BigInt(tx.gasPrice || '0') * BigInt(tx.gasUsed || '0')).toString()
      ));
      
      // Create action history item
      actionItems.push({
        id: tx.hash,
        action,
        details,
        timestamp: new Date(parseInt(tx.timeStamp) * 1000),
        gasCost,
        txHash: tx.hash,
      });
    } catch (error) {
      // Skip transactions that can't be processed
      console.debug('Could not process transaction:', error);
    }
  }
  
  return actionItems;
}
