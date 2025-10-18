
"use client";

import type { Token, UniswapPool } from "@/app/lib/types";
import { getUniswapPools } from "@/app/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

function formatCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(2)}`;
}

function UniswapPoolsTable() {
    const pools = getUniswapPools();

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-center w-[40px]">#</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Fee tier</TableHead>
                    <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                            <ChevronDown className="size-4" /> TVL
                        </div>
                    </TableHead>
                    <TableHead className="text-right">Pool APR</TableHead>
                    <TableHead className="text-right">1D vol</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {pools.map((pool, index) => (
                    <TableRow key={pool.id} className="cursor-pointer">
                        <TableCell className="text-center text-muted-foreground">
                            <Link href={`/pools/${pool.id}`} className="block w-full h-full">
                                {index + 1}
                            </Link>
                        </TableCell>
                        <TableCell>
                             <Link href={`/pools/${pool.id}`} className="block w-full h-full">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        <Image src={pool.pair[0].icon.imageUrl} alt={pool.pair[0].name} width={24} height={24} className="rounded-full border-2 border-card" data-ai-hint={pool.pair[0].icon.imageHint}/>
                                        <Image src={pool.pair[1].icon.imageUrl} alt={pool.pair[1].name} width={24} height={24} className="rounded-full border-2 border-card" data-ai-hint={pool.pair[1].icon.imageHint}/>
                                    </div>
                                    <span className="font-medium">{pool.pair[0].symbol}/{pool.pair[1].symbol}</span>
                                </div>
                            </Link>
                        </TableCell>
                        <TableCell><Link href={`/pools/${pool.id}`} className="block w-full h-full">{pool.protocolVersion}</Link></TableCell>
                        <TableCell><Link href={`/pools/${pool.id}`} className="block w-full h-full">{pool.feeTier}%</Link></TableCell>
                        <TableCell className="text-right"><Link href={`/pools/${pool.id}`} className="block w-full h-full">{formatCurrency(pool.tvl)}</Link></TableCell>
                        <TableCell className="text-right"><Link href={`/pools/${pool.id}`} className="block w-full h-full">{pool.poolApr.toFixed(2)}%</Link></TableCell>
                        <TableCell className="text-right"><Link href={`/pools/${pool.id}`} className="block w-full h-full">{formatCurrency(pool.volume1d)}</Link></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export function DexInterface({ tokens }: { tokens: Token[] }) {
  const { toast } = useToast();
  const [aeroPool, setAeroPool] = useState<string | undefined>();
  const [aeroAmount1, setAeroAmount1] = useState('');
  const [aeroAmount2, setAeroAmount2] = useState('');

  const handleAddLiquidity = (protocol: 'Aerodrome' | 'Uniswap V3') => {
    toast({
        title: "Transaction Submitted",
        description: `Adding liquidity to ${protocol}.`
    });
  }
  
  const handleRemoveLiquidity = (protocol: 'Aerodrome' | 'Uniswap V3') => {
    toast({
        title: "Transaction Submitted",
        description: `Removing liquidity from ${protocol}.`
    });
  }


  return (
    <Tabs defaultValue="aerodrome">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="aerodrome">Aerodrome</TabsTrigger>
        <TabsTrigger value="uniswap">Uniswap</TabsTrigger>
      </TabsList>
      <TabsContent value="aerodrome" className="space-y-6 pt-4">
        <div className="space-y-2">
            <Label>Pool</Label>
            <Select value={aeroPool} onValueChange={setAeroPool}>
                <SelectTrigger><SelectValue placeholder="Select a token pair" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="eth-usdc">ETH/USDC</SelectItem>
                    <SelectItem value="aero-eth">AERO/ETH</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="aero-amount-1">Amount 1</Label>
          <Input id="aero-amount-1" placeholder="0.0" value={aeroAmount1} onChange={e => setAeroAmount1(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="aero-amount-2">Amount 2</Label>
          <Input id="aero-amount-2" placeholder="0.0" value={aeroAmount2} onChange={e => setAeroAmount2(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => handleAddLiquidity('Aerodrome')}>Add Liquidity</Button>
          <Button variant="outline" onClick={() => handleRemoveLiquidity('Aerodrome')}>Remove Liquidity</Button>
        </div>
      </TabsContent>
      <TabsContent value="uniswap" className="space-y-6 pt-4">
        <UniswapPoolsTable />
      </TabsContent>
    </Tabs>
  );
}
