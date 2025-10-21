
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { UniswapPool } from "@/app/lib/types";
import Link from "next/link";

function formatCurrency(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
}

function formatNumber(value: number) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
}

function StatRow({ label, value, subValue, subValueClassName }: { label: string, value: string, subValue?: string, subValueClassName?: string }) {
    return (
        <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="text-right">
                <span className="text-sm font-semibold">{value}</span>
                {subValue && <span className={`ml-1 text-xs font-mono ${subValueClassName}`}>{subValue}</span>}
            </div>
        </div>
    )
}

export function PoolStats({ pool }: { pool: UniswapPool }) {
    // Defensive: poolBalances may be empty or missing for dynamically-discovered pools
    const balances = Array.isArray(pool.poolBalances) ? pool.poolBalances : [];
    const defaultBal = { token: { symbol: '' }, amount: 0 } as any;
    const [token0 = defaultBal, token1 = defaultBal] = balances;

    // Calculate value based on TVL and percentage of each token.
    // This is a simplification. A real app would need price feeds.
    const totalBalanceValue = Number(pool.tvl) || 0;
    const sumAmounts = (Number(token0.amount) || 0) + (Number(token1.amount) || 0);
    const token0Value = sumAmounts > 0 ? (Number(token0.amount) / sumAmounts) * totalBalanceValue : 0;
    const token1Value = sumAmounts > 0 ? (Number(token1.amount) / sumAmounts) * totalBalanceValue : 0;
    const token0Percentage = totalBalanceValue > 0 ? (token0Value / totalBalanceValue) * 100 : 0;
    
    const isTvlUp = pool.tvlChange >= 0;
    const isVolumeUp = pool.volume1dChange >= 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary">Swap</Button>
                <Button variant="secondary" asChild>
                    <Link href={`/pools/new?pool=${encodeURIComponent(pool.poolAddress)}`}>Add Liquidity</Link>
                </Button>
            </div>
            
            <Card>
                <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-medium">Total APR</h3>
                    <p className="text-2xl font-bold">{pool.poolApr.toFixed(2)}%</p>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <h3 className="font-medium">Stats</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground mb-2">Pool balances</p>
                            <div className="flex justify-between text-xs font-mono mb-1">
                                <span>{formatNumber(Number(token0.amount) || 0)} {token0.token?.symbol || ''}</span>
                                <span>{formatNumber(Number(token1.amount) || 0)} {token1.token?.symbol || ''}</span>
                            </div>
                            <Progress value={Math.max(0, Math.min(100, Number.isFinite(token0Percentage) ? token0Percentage : 0))} />
                        </div>
                         <StatRow 
                            label="TVL"
                            value={formatCurrency(pool.tvl)}
                            subValue={`${isTvlUp ? '+' : ''}${pool.tvlChange.toFixed(2)}%`}
                            subValueClassName={isTvlUp ? 'text-green-400' : 'text-red-400'}
                        />
                         <StatRow 
                            label="24H volume"
                            value={formatCurrency(pool.volume1d)}
                             subValue={`${isVolumeUp ? '+' : ''}${pool.volume1dChange.toFixed(2)}%`}
                            subValueClassName={isVolumeUp ? 'text-green-400' : 'text-red-400'}
                        />
                         <StatRow 
                            label="24H fees"
                            value={formatCurrency(pool.fees1d)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

