"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, FileText } from 'lucide-react';
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
        const { data: balanceData, isLoading } = useBalance({
            address,
        });

    const equity = address && balanceData ? parseFloat(balanceData.formatted).toFixed(4) : '0.00';

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardContent className="p-4 grid grid-cols-2 gap-4">
                    <StatCard title="Total Equity (ETH)" value={isLoading ? '...' : equity} />
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
                        {address && balanceData && parseFloat(balanceData.formatted) > 0 ? (
                            <div className="w-full space-y-4">
                                <div className="rounded-lg border">
                                    <div className="grid grid-cols-3 gap-4 p-4 font-semibold border-b">
                                        <div>Token</div>
                                        <div className="text-right">Balance</div>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-3 gap-4 items-center">
                                            <div className="font-medium">ETH</div>
                                            <div className="text-right">{parseFloat(balanceData.formatted).toFixed(4)}</div>
                                        </div>
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
