"use client";

import type { Token } from "@/app/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwapWidget } from "@/components/app/swap-widget";
import { DexInterface } from "@/components/app/dex-interface";
import { LpPositions } from "./lp-positions";
import { ActionHistory } from "./action-history";
import { getLpPositions } from "@/app/lib/mock-data";


export function LeaderTerminal({ tokens }: { tokens: Token[] }) {
    const leaderId = 'leader-1';
    const lpPositions = getLpPositions(leaderId);
    // We'll use the Etherscan API data instead of mock data for action history

    return (
        <div className="p-4 md:p-6">
            <Tabs defaultValue="terminal">
                <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 border-b rounded-none">
                    <TabsTrigger value="terminal" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-b-primary rounded-none">Terminal</TabsTrigger>
                    <TabsTrigger value="positions" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-b-primary rounded-none">Positions</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-b-primary rounded-none">History</TabsTrigger>
                </TabsList>
                <TabsContent value="terminal" className="pt-6">
                     <Card>
                        <CardContent className="p-4">
                            <Tabs defaultValue="swap">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="swap">Swap</TabsTrigger>
                                    <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                                </TabsList>
                                <TabsContent value="swap" className="pt-6">
                                     <SwapWidget tokens={tokens} />
                                </TabsContent>
                                <TabsContent value="liquidity" className="pt-6">
                                    <DexInterface tokens={tokens} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="positions" className="pt-6 space-y-6">
                    <LpPositions/>
                </TabsContent>
                <TabsContent value="history" className="pt-6 space-y-6">
                    <ActionHistory 
                        address="0x109260B1e1b907C3f2CC4d55e9e7AB043CB82D17" 
                    />
                </TabsContent>
            </Tabs>
        </div>
    )
}
