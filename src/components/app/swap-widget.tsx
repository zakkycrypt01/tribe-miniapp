
"use client";

import type { Token } from "@/app/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const MOCK_EXCHANGE_RATES: Record<string, Record<string, number>> = {
    'ETH': { 'USDC': 3000, 'WBTC': 0.05, 'UNI': 250 },
    'USDC': { 'ETH': 1/3000, 'WBTC': 1/60000, 'UNI': 1/12 },
    'WBTC': { 'ETH': 20, 'USDC': 60000, 'UNI': 5000 },
    'UNI': { 'ETH': 1/250, 'USDC': 12, 'WBTC': 1/5000 },
};


export function SwapWidget({ tokens }: { tokens: Token[] }) {
  const [fromToken, setFromToken] = useState<string | undefined>();
  const [toToken, setToToken] = useState<string | undefined>();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (fromToken && toToken && fromAmount) {
      const rate = MOCK_EXCHANGE_RATES[fromToken]?.[toToken] || 0;
      const calculatedToAmount = parseFloat(fromAmount) * rate;
      setToAmount(calculatedToAmount.toFixed(5));
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken, toToken]);

  const handleSwap = () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Swap",
        description: "Please select tokens and enter a valid amount.",
      });
      return;
    }
    toast({
      title: "Swap Submitted",
      description: `Swapping ${fromAmount} ${fromToken} for ${toAmount} ${toToken}.`,
    });
    // Reset form
    setFromAmount('');
  };
  
  const handleFlip = () => {
      const tempToken = fromToken;
      setFromToken(toToken);
      setToToken(tempToken);

      const tempAmount = fromAmount;
      setFromAmount(toAmount);
      setToAmount(tempAmount);
  }

  return (
      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">From</label>
          <div className="flex gap-2">
            <Input 
                type="number" 
                placeholder="0.0" 
                className="flex-1"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
            />
            <Select value={fromToken} onValueChange={setFromToken}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map(token => (
                  <SelectItem key={token.id} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <Image src={token.icon.imageUrl} alt={token.name} width={20} height={20} className="rounded-full" data-ai-hint={token.icon.imageHint}/>
                      {token.symbol}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="rounded-full border" onClick={handleFlip}>
                <ArrowDown className="size-4" />
            </Button>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium">To</label>
          <div className="flex gap-2">
            <Input 
                type="number" 
                placeholder="0.0" 
                className="flex-1"
                value={toAmount}
                readOnly
            />
            <Select value={toToken} onValueChange={setToToken}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Token" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map(token => (
                  <SelectItem key={token.id} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <Image src={token.icon.imageUrl} alt={token.name} width={20} height={20} className="rounded-full" data-ai-hint={token.icon.imageHint}/>
                      {token.symbol}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleSwap}>Swap</Button>
      </div>
  );
}
