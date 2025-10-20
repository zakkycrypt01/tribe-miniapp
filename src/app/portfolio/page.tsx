"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, FileText } from 'lucide-react';
import React, { useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useRole } from "@/context/RoleContext";
import { LeaderTerminal } from "@/components/app/leader-terminal";
import { getTokens } from "../lib/mock-data";


function StatCard({ title, value, subValue }: { title: string, value: string, subValue?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>{title}</span>
        <HelpCircle className="size-3" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {subValue && <div className="text-sm text-muted-foreground">{subValue}</div>}
    </div>
  )
}


function FollowerPortfolioPage() {
    const { address } = useAccount();
    const tokens = useMemo(() => getTokens(), []);

    // Token contract addresses (replace with real addresses in production)
    const tokenAddresses: Record<string, `0x${string}` | undefined> = {
        ETH: undefined,
        WETH: '0x4200000000000000000000000000000000000006',
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        WBTC: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
    };

    // CoinGecko API ids for tokens
    const coingeckoIds: Record<string, string> = {
        ETH: 'ethereum',
        WETH: 'weth',
        USDC: 'usd-coin',
        WBTC: 'wrapped-bitcoin',
    };

    // Fetch live prices from CoinGecko
    const [prices, setPrices] = React.useState<Record<string, number>>({});
    React.useEffect(() => {
        const ids = tokens.map(t => coingeckoIds[t.symbol]).filter(Boolean).join(',');
        if (!ids) return;
        fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
            .then(res => res.json())
            .then(data => {
                const newPrices: Record<string, number> = {};
                tokens.forEach(token => {
                    const id = coingeckoIds[token.symbol];
                    if (id && data[id]?.usd) {
                        newPrices[token.symbol] = data[id].usd;
                    }
                });
                setPrices(newPrices);
            });
    }, [tokens]);

    // Fetch balances for all tokens
    const balances = tokens.map(token => {
        const tokenAddress = tokenAddresses[token.symbol] as `0x${string}` | undefined;
        const { data, isLoading } = useBalance({ address, token: tokenAddress });
        return { token, data, isLoading };
    });

    // Check if any token has a balance > 0
    const hasBalance = balances.some(b => b.data && parseFloat(b.data.formatted) > 0);
    const isLoading = balances.some(b => b.isLoading);

    // Calculate total USD equity using live prices
    const totalUsd = balances.reduce((sum, b) => {
        if (!b.data || !address) return sum;
        const price = prices[b.token.symbol] || 0;
        return sum + parseFloat(b.data.formatted) * price;
    }, 0);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                    <StatCard title="Total Equity (USD)" value={isLoading ? '...' : totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
                    <StatCard title="Cumulative ROI" value="0.00" subValue="(0.00%)" />
                </CardContent>
            </Card>

            <Tabs defaultValue="current">
                <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 border-b rounded-none">
                    <TabsTrigger value="current" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-b-primary rounded-none">Current Holdings</TabsTrigger>
                    <TabsTrigger value="past" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-b-primary rounded-none">Past Holdings</TabsTrigger>
                </TabsList>
                <TabsContent value="current" className="pt-6">
                    <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                        {address && hasBalance ? (
                            <div className="w-full space-y-4">
                                <div className="rounded-lg border border-[#2c3552] bg-[#0a1732]">
                                    <div className="grid grid-cols-3 gap-0 px-6 py-3 font-semibold border-b border-[#2c3552] text-white">
                                        <div className="flex items-center gap-2">Token</div>
                                        <div className="text-right">Balance</div>
                                        <div className="text-right">USD Value</div>
                                    </div>
                                    <div className="px-6 py-2">
                                        {balances.map(b => b.data && (
                                            <div key={b.token.symbol} className="grid grid-cols-3 gap-0 items-center py-2 border-b border-[#1a2240] last:border-b-0">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <img src={b.token.icon.imageUrl} alt={b.token.symbol} width={24} height={24} className="rounded-full" />
                                                    <span className="text-base text-white">{b.token.symbol}</span>
                                                </div>
                                                <div className="text-right text-base text-white">{parseFloat(b.data.formatted).toFixed(4)}</div>
                                                <div className="text-right text-base text-white">${(parseFloat(b.data.formatted) * (prices[b.token.symbol] || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <FileText className="size-16 text-muted-foreground/50" />
                                <p className="text-muted-foreground">No Records</p>
                            </>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="past" className="pt-6">
                    <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                        <FileText className="size-16 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No Records</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function PortfolioPage() {
    const { role } = useRole();
    const tokens = getTokens();

    return (
        <main className="flex flex-1 flex-col">
            {role === 'follower' ? <FollowerPortfolioPage /> : <LeaderTerminal tokens={tokens} />}
        </main>
    );
}

// Also exporting FollowerPortfolioPage to be used in other places like profile page.
export { FollowerPortfolioPage };
