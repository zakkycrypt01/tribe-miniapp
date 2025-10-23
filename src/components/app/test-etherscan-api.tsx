// TestEtherscanAPI.tsx
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

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
      const options = {method: 'GET', body: undefined};
      
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
        <Button 
          onClick={fetchTransactions}
          disabled={isLoading}
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
        
        {data && (
          <div className="p-4 border bg-slate-50 rounded-md">
            <pre className="text-xs overflow-auto max-h-[400px]">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}