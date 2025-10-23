// TestEtherscanAPI.tsx
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { CONTRACT_ADDRESSES } from '@/constants/abis';

export function TestEtherscanAPI() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Using the exact URL and options from the user's request
      const url = 'https://api.etherscan.io/v2/api?apikey=NH9T3PWS3WGD7AKF9NV4FJ7GJB71TENBTI&chainid=84532&module=account&action=txlist&address=0x109260B1e1b907C3f2CC4d55e9e7AB043CB82D17&startblock=0&endblock=9999999999&offset=1&sort=desc';
      const options = {method: 'GET'};
      
      const response = await fetch(url, options);
      const responseData = await response.json();
      
      console.log('API Response:', responseData);
      setData(responseData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etherscan API Test</CardTitle>
        <CardDescription>Test the Etherscan API connection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Contract Addresses</h3>
            <div className="text-xs font-mono bg-slate-100 p-2 rounded overflow-auto max-h-[200px]">
              <p><strong>LEADER_TERMINAL:</strong> {CONTRACT_ADDRESSES.LEADER_TERMINAL}</p>
              <p><strong>VAULT_FACTORY:</strong> {CONTRACT_ADDRESSES.VAULT_FACTORY}</p>
              <p><strong>UNISWAP_V3_ADAPTER:</strong> {CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER}</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Test Address</h3>
            <div className="text-xs font-mono bg-slate-100 p-2 rounded">
              0x109260B1e1b907C3f2CC4d55e9e7AB043CB82D17
            </div>
          </div>
        </div>
        
        <Button 
          onClick={fetchTransactions}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Test API Call'
          )}
        </Button>
        
        {error && (
          <div className="p-4 border border-red-500 bg-red-50 text-red-700 rounded-md">
            Error: {error}
          </div>
        )}
        
        {data && data.result && (
          <div className="p-4 border bg-slate-50 rounded-md">
            <h3 className="font-medium mb-2">Transaction Count: {data.result.length}</h3>
            <h4 className="text-sm font-medium mb-1">Sample Transaction:</h4>
            <pre className="text-xs overflow-auto max-h-[300px]">
              {JSON.stringify(data.result[0], null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}