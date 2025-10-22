
"use client";

import { getLpPositions } from "@/app/lib/mock-data";
import { notFound, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { PerformanceChart } from "@/components/app/performance-chart";
import { LpPositions } from "@/components/app/lp-positions";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useReadContract } from "wagmi";
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import type { Leader } from "@/app/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const mapContractLeaderToLeader = (contractLeader: any): Leader => {
  const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img]));
  const defaultAvatar = imageMap.get('avatar-1')!;
  
  // Contract returns: [wallet, strategyName, description, isActive, registrationTime, totalFollowers, totalTvl, performanceFeePercent]
  const wallet = contractLeader[0] || '';
  const strategyName = contractLeader[1] || '';
  const description = contractLeader[2] || '';
  const isActive = contractLeader[3] || false;
  const registrationTime = contractLeader[4] || 0;
  const totalFollowers = contractLeader[5] || 0;
  const totalTvl = contractLeader[6] || 0n;
  const performanceFeePercent = contractLeader[7] || 0;
  
  console.log('🔄 Mapping contract data:', { 
    wallet, 
    strategyName, 
    description, 
    isActive, 
    registrationTime,
    totalFollowers,
    totalTvl: Number(totalTvl),
    performanceFeePercent
  });
  console.log('📍 Array breakdown:', {
    '[0] wallet': contractLeader[0],
    '[1] strategyName': contractLeader[1],
    '[2] description': contractLeader[2],
    '[3] isActive': contractLeader[3],
    '[4] registrationTime': contractLeader[4],
    '[5] totalFollowers': contractLeader[5],
    '[6] totalTvl': contractLeader[6],
    '[7] performanceFeePercent': contractLeader[7],
  });
  
  return {
    id: wallet,
    name: strategyName,
    avatar: defaultAvatar,
    walletAddress: wallet,
    strategyDescription: description,
    apy30d: 0,
    totalFees: performanceFeePercent / 100, // Convert basis points (1000 = 1%) to percentage
    riskScore: 'Low', 
    followers: Number(totalFollowers),
    tvl: Number(totalTvl),
    maxDrawdown: 0,
    historicalApy: [
      { date: '2025-01-01', apy: 0 },
      { date: '2025-02-01', apy: 0 },
      { date: '2025-03-01', apy: 0 },
      { date: '2025-04-01', apy: 0 },
      { date: '2025-05-01', apy: 0 },
      { date: '2025-06-01', apy: 0 },
    ],
    followersPnl: 0,
    winRate: 0,
    sharpeRatio: 0,
    followerCount: Number(totalFollowers),
    maxFollowers: 0,
  };
};

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

export default function LeaderProfilePage() {
  const params = useParams();
  const walletAddress = typeof params.id === 'string' ? decodeURIComponent(params.id) : '';
  
  console.log('🔍 Loading leader profile for:', walletAddress);

  // Use the hook to fetch leader data
  const { data: contractLeader, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
    abi: ABIS.TribeLeaderRegistry,
    functionName: "leaders",
    args: [walletAddress as `0x${string}`],
    query: { enabled: !!walletAddress },
  });

  useEffect(() => {
    if (contractLeader) {
      console.log('📊 Fetched leader profile from contract:', contractLeader);
    }
    if (error) {
      console.error('❌ Error fetching leader profile:', error);
    }
  }, [contractLeader, error]);

  const leader = useMemo(() => {
    if (!contractLeader) return null;
    const mappedLeader = mapContractLeaderToLeader(contractLeader);
    console.log('✅ Mapped leader:', mappedLeader);
    return mappedLeader;
  }, [contractLeader]);

  const lpPositions = leader ? getLpPositions(leader.id) : [];
  
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyAmount, setCopyAmount] = useState('');
  const { toast } = useToast();

  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  if (isLoading || !leader) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading leader profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load leader profile</p>
          <p className="text-sm text-muted-foreground">{String(error)}</p>
        </div>
      </div>
    );
  }

  const handleCopyConfirm = () => {
    if (!copyAmount || parseFloat(copyAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount to deposit.",
      });
      return;
    }
    
    setIsCopyDialogOpen(false);
    setIsDepositing(true);

    // Simulate transaction
    setTimeout(() => {
        setDepositSuccess(true);
    }, 3000);
  };

  const resetCopyFlow = () => {
    setIsDepositing(false);
    setDepositSuccess(false);
    setCopyAmount('');
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row items-start gap-6">
              <Avatar className="w-24 h-24 border-2 border-primary">
                <AvatarImage src={leader.avatar.imageUrl} alt={leader.name} data-ai-hint={leader.avatar.imageHint} />
                <AvatarFallback className="text-3xl">{leader.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <h1 className="font-headline text-2xl font-semibold md:text-3xl">{leader.name}</h1>
                      <Button onClick={() => setIsCopyDialogOpen(true)} className="mt-4 sm:mt-0">Copy Strategy</Button>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                      <p className="font-mono text-sm">{`${leader.walletAddress.slice(0, 6)}...${leader.walletAddress.slice(-4)}`}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-4 w-4"/></Button>
                  </div>
                  <p className="text-muted-foreground max-w-prose">{leader.strategyDescription}</p>
              </div>
          </CardContent>
        </Card>
        
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="30d Net APY" value={`+${leader.apy30d.toFixed(2)}%`} valueClassName="text-green-400" />
          <StatCard title="Performance Fee" value={`${leader.totalFees.toFixed(2)}%`} />
          <StatCard title="TVL" value={`$${leader.tvl.toLocaleString()}`} />
          <StatCard title="Followers" value={leader.followers.toLocaleString()} />
          <StatCard title="Risk Score" value={leader.riskScore} />
          <Card className="col-span-full mt-4">
              <CardHeader>
                  <CardTitle>Historical APY</CardTitle>
                  <CardDescription>Performance over the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                  <PerformanceChart data={leader.historicalApy} />
              </CardContent>
          </Card>
        </div>

        <LpPositions positions={lpPositions} />

      </main>

      <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Strategy: {leader.name}</DialogTitle>
            <DialogDescription>
              Define the amount of capital you want to deposit into the vault to copy this strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="copy-amount">Capital to Deposit (USDC)</Label>
              <Input
                id="copy-amount"
                type="number"
                placeholder="0.00"
                value={copyAmount}
                onChange={(e) => setCopyAmount(e.target.value)}
              />
            </div>
             <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">You will deposit:</span>
                    <span className="font-medium">{copyAmount ? parseFloat(copyAmount).toLocaleString() : '0.00'} USDC</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Estimated Gas Fee:</span>
                    <span className="font-mono">~0.006 ETH</span>
                </div>
             </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleCopyConfirm}>Confirm & Deposit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepositing} onOpenChange={resetCopyFlow}>
          <DialogContent hideCloseButton>
            <DialogHeader>
                <DialogTitle>{depositSuccess ? "Deposit Successful" : "Processing Deposit"}</DialogTitle>
            </DialogHeader>
              { !depositSuccess ? (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <h3 className="text-xl font-bold">Processing Deposit</h3>
                    <p className="text-muted-foreground">Your transaction is being submitted to the blockchain. Please wait...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <h3 className="text-xl font-bold">Deposit Successful!</h3>
                    <p className="text-muted-foreground">You are now copying {leader.name}. You can track your new position from your portfolio.</p>
                     <div className="flex gap-4 w-full pt-4">
                        <Button variant="outline" className="w-full" onClick={resetCopyFlow}>Close</Button>
                        <Button asChild className="w-full">
                            <Link href="/portfolio">View Position</Link>
                        </Button>
                    </div>
                </div>
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
