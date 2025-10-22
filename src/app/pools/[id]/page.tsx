
"use client";

import { getUniswapPoolData, getPoolTransactions, getUniswapPools } from "@/app/lib/mock-data";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowUp, ChevronRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import { PoolChart } from "@/components/app/pool-chart";
import { PoolStats } from "@/components/app/pool-stats";
import { TransactionsTable } from "@/components/app/transactions-table";


export default function PoolDetailsPage() {
    const params = useParams();
    const id = typeof params.id === 'string' ? params.id : '';
    // Try several ways to resolve the requested pool id:
    // 1) direct id lookup
    // 2) match by poolAddress
    // 3) match by pair symbols (e.g. "ETH/USDC")
    const transactions = getPoolTransactions();

    let pool = getUniswapPoolData(id);
    if (!pool) {
        const allPools = getUniswapPools();
        // try poolAddress match (id could be an address)
        const byAddress = allPools.find(p => p.poolAddress?.toLowerCase() === id.toLowerCase());
        if (byAddress) pool = byAddress;
        // try pair symbol match like 'eth-usdc' or 'eth/usdc'
        if (!pool) {
            const normalized = id.replace(/[-_]/g, '/').toLowerCase();
            const byPair = allPools.find(p => {
                const [a, b] = p.pair;
                const s1 = `${a.symbol}/${b.symbol}`.toLowerCase();
                const s2 = `${b.symbol}/${a.symbol}`.toLowerCase();
                return s1 === normalized || s2 === normalized || s1.replace('/', '-') === id.toLowerCase();
            });
            if (byPair) pool = byPair;
        }
    }

    if (!pool) {
        // If still not found, render a friendly fallback listing discovered pools
        const available = getUniswapPools();
        return (
            <main className="flex flex-1 flex-col p-4 md:p-6 space-y-6">
                <div className="text-lg font-semibold">Pool not found</div>
                <p className="text-sm text-muted-foreground">We couldn't find a pool matching "{id}". Here are discovered pools you can open:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {available.map(p => {
                        const [t0, t1] = p.pair;
                        const hrefId = (p.poolAddress || p.id || '').toLowerCase();
                        return (
                            <Link key={hrefId} href={`/pools/${hrefId}`} className="p-3 border rounded-md hover:shadow-sm">
                                <div className="text-sm font-medium">{t0.symbol} / {t1.symbol}</div>
                                <div className="text-xs text-muted-foreground">{p.protocolVersion} • {p.feeTier}% • {p.poolAddress?.slice(0,6)}...{p.poolAddress?.slice(-4)}</div>
                            </Link>
                        );
                    })}
                </div>
            </main>
        );
    }

    const [token0, token1] = pool.pair;

    return (
        <main className="flex flex-1 flex-col p-4 md:p-6 space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground">Explore</Link>
                <ChevronRight className="h-4 w-4" />
                <Link href="/" className="hover:text-foreground">Pools</Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">{token0.symbol} / {token1.symbol}</span>
                <span className="font-mono">{`${pool.poolAddress.slice(0, 6)}...${pool.poolAddress.slice(-4)}`}</span>
                 <a href={`https://basescan.org/address/${pool.poolAddress}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:underline">
                    <ExternalLink className="size-4" />
                </a>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                    <Image src={token0.icon.imageUrl} alt={token0.name} width={40} height={40} className="rounded-full border-2 border-background" data-ai-hint={token0.icon.imageHint}/>
                    <Image src={token1.icon.imageUrl} alt={token1.name} width={40} height={40} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{token0.symbol} / {token1.symbol}</h1>
                <span className="text-sm px-2 py-1 bg-muted rounded-md">{pool.protocolVersion}</span>
                <span className="text-sm px-2 py-1 bg-muted rounded-md">{pool.feeTier}%</span>
                <Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowUp className="rotate-45" /></Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 flex flex-col gap-6">
                   {/* <PoolChart pool={pool} /> */}
                   {/* <TransactionsTable transactions={transactions} /> */}
                </div>
                <div className="lg:col-span-1">
                    <PoolStats pool={pool} />
                </div>
            </div>


        </main>
    );
}

