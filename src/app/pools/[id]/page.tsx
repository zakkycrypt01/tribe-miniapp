
"use client";

import { getUniswapPoolData, getPoolTransactions } from "@/app/lib/mock-data";
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
    const pool = getUniswapPoolData(id);
    const transactions = getPoolTransactions();

    if (!pool) {
        notFound();
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
                   <PoolChart pool={pool} />
                   <TransactionsTable transactions={transactions} />
                </div>
                <div className="lg:col-span-1">
                    <PoolStats pool={pool} />
                </div>
            </div>


        </main>
    );
}

