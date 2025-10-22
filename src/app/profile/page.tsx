"use client";

import { getLeaderData, getLpPositions, getActionHistory } from "@/app/lib/mock-data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Copy, Edit } from "lucide-react";
import { PerformanceChart } from "@/components/app/performance-chart";
import { LpPositions } from "@/components/app/lp-positions";
import { ActionHistory } from "@/components/app/action-history";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/context/RoleContext";
import PortfolioPage from "../portfolio/page";
import { useReadContract, useAccount } from "wagmi";
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";

export function useLeaderRegistryGetLeader(address: string) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
    abi: ABIS.TribeLeaderRegistry,
    functionName: "getLeader",
    args: [address],
  });
}

type StatCardProps = {
    icon?: React.ElementType;
    title: string;
    value: string;
    description?: string;
    valueClassName?: string;
}

function StatCard({ icon: Icon, title, value, description, valueClassName}: StatCardProps) {
  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader className="p-2 flex flex-col items-start space-y-1">
        <CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle>
         {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent className="p-2">
        <div className={`text-xl font-semibold ${valueClassName}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function LeaderProfileView() {
  const leaderId = 'leader-1'; // Hardcoded for the logged-in leader
  const leader = getLeaderData(leaderId);
  const lpPositions = getLpPositions(leaderId);
  const actionHistory = getActionHistory(leaderId);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [strategyName, setStrategyName] = useState(leader?.name || '');
  const [strategyDescription, setStrategyDescription] = useState(leader?.strategyDescription || '');

  const { address } = useAccount();
  const {
    data: leaderOnChain,
    isLoading,
    error,
  } = useLeaderRegistryGetLeader(address ? `0x${address}` : '');

  if (!leader) {
    notFound();
  }

  const handleSaveChanges = () => {
    // Here you would typically save the changes to your backend
    console.log("Saving changes:", { strategyName, strategyDescription });
    setIsEditDialogOpen(false);
    // You might want to optimistically update the UI or refetch data
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-primary">
              <AvatarImage src={leader.avatar.imageUrl} alt={leader.name} data-ai-hint={leader.avatar.imageHint} />
              <AvatarFallback className="text-3xl">{leader.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h1 className="font-headline text-2xl font-semibold md:text-3xl">{strategyName}</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2" /> Edit Strategy</Button>
                        <Button asChild><Link href="/portfolio">My Trades</Link></Button>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <p className="font-mono text-sm">{`${leader.walletAddress.slice(0, 6)}...${leader.walletAddress.slice(-4)}`}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-4 w-4"/></Button>
                </div>
                <p className="text-muted-foreground max-w-prose">{strategyDescription}</p>
            </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="30d Net APY" value={`+${leader.apy30d.toFixed(2)}%`} valueClassName="text-green-400" />
        <StatCard title="Total Fees Earned" value={`$${leader.totalFees.toLocaleString()}`} />
        <StatCard title="TVL" value={`$${leader.tvl.toLocaleString()}`} />
        <StatCard title="Followers" value={leader.followers.toLocaleString()} />
        <StatCard title="Risk Score" value={leader.riskScore} />
        <Card className="col-span-full mt-4">
            <CardHeader>
                <CardTitle>Historical APY</CardTitle>
                <CardDescription>Your performance over the last 30 days.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <PerformanceChart data={leader.historicalApy} />
            </CardContent>
        </Card>
      </div>

      <LpPositions />
      <ActionHistory history={actionHistory} />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Strategy</DialogTitle>
            <DialogDescription>
              Update the public-facing name and description of your strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                className="col-span-3 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button type="submit" onClick={handleSaveChanges}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function MyProfilePage() {
    const { role } = useRole();

    if (role === 'leader') {
        return <LeaderProfileView />;
    }
    
    // For followers, show their main portfolio view.
    return <PortfolioPage />;
}
