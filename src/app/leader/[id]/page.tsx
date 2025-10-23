"use client";

import { getLpPositions } from "@/app/lib/mock-data";
import { notFound, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { PerformanceChart } from "@/components/app/performance-chart";
import { LpPositions } from "@/components/app/lp-positions";
import { ActionHistory } from "@/components/app/action-history";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccount, useBalance } from "wagmi";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import { parseUnits } from "viem";
import type { Leader } from "@/app/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { readContract } from '@wagmi/core';
import { config } from '@/components/providers/WagmiProvider';
import { useDeposit } from '@/hooks/use-deposit';

const SUPPORTED_TOKENS = [
  { 
    symbol: "USDC", 
    name: "USD Coin",
    address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", 
    decimals: 6,
    logoUrl: "/assets/images/tokens/usdc.png" 
  },
  { 
    symbol: "WETH", 
    name: "Wrapped Ether",
    address: "0x4200000000000000000000000000000000000006", 
    decimals: 18,
    logoUrl: "/assets/images/tokens/eth.png" 
  },
  { 
    symbol: "WBTC", 
    name: "Wrapped BTC",
    address: "0xcbB7C0006F23900c38EB856149F799620fcb8A4a", 
    decimals: 8,
    logoUrl: "/assets/images/tokens/wbtc.png"
  },
  { 
    symbol: "UNI", 
    name: "Uniswap",
    address: "0xB62b54F9b13F3bE72A65117a705c930e42563ab4", 
    decimals: 18,
    logoUrl: "/assets/images/tokens/uni.png"
  }
];

const mapContractLeaderToLeader = (contractLeader: any): Leader => {
  const imageMap = new Map(PlaceHolderImages.map(img => [img.id, img]));
  const defaultAvatar = imageMap.get('avatar-1')!;
  
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
  
  return {
    id: wallet,
    name: strategyName,
    avatar: defaultAvatar,
    walletAddress: wallet,
    strategyDescription: description,
    apy30d: 0,
    totalFees: performanceFeePercent / 100,
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
  
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyAmount, setCopyAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]);
  const { toast } = useToast();
  
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [currentTxStep, setCurrentTxStep] = useState<string>('');
  const [currentTxHash, setCurrentTxHash] = useState<string>('');
  
  const { address: userAddress } = useAccount();
  const { data: tokenBalance } = useBalance({
    address: userAddress,
    token: selectedToken.address as `0x${string}`,
  });
  
  const { writeContractAsync } = useWriteContract();
  
  // Move useDeposit hook to top level to follow React hooks rules
  const { depositMultipleTokens, isLoading: isDepositLoading, currentStep: depositStep, txHash: depositTxHash, vaultState } = useDeposit({
    leaderAddress: walletAddress as `0x${string}`,
    onSuccess: () => {
      setDepositSuccess(true);
      if (leader) {
        toast({
          title: "Deposit Successful",
          description: `You've successfully copied ${leader.name}'s strategy with ${copyAmount} ${selectedToken.symbol}.`,
        });
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to complete the deposit. Please try again."
      });
      setIsDepositing(false);
    },
  });
  
  const lpPositions = leader ? getLpPositions(leader.id) : [];
  
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
  
  // Remove duplicate hook declaration since we moved it to the top level

  const handleCopyConfirm = async () => {
    if (!copyAmount || parseFloat(copyAmount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount to deposit.",
      });
      return;
    }
    
    if (tokenBalance && parseFloat(copyAmount) > parseFloat(tokenBalance.formatted)) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `You don't have enough ${selectedToken.symbol} for this deposit.`,
      });
      return;
    }
    
    setIsCopyDialogOpen(false);
    setIsDepositing(true);
    setCurrentTxStep('Initiating copy trading setup...');
    setCurrentTxHash('');
    setDepositSuccess(false);

    try {
      const tokenDecimals = selectedToken.decimals;
      const depositAmount = parseUnits(copyAmount, tokenDecimals);
      
      await depositMultipleTokens([{
        token: selectedToken.address as `0x${string}`,
        amount: depositAmount,
        decimals: tokenDecimals
      }]);

    } catch (error) {
      console.error("Deposit Error:", error);
      toast({
        variant: "destructive",
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Failed to complete the deposit. Please try again."
      });
      setIsDepositing(false);
    }
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

        <LpPositions/>
        
        <Card>
          <CardHeader>
            <CardTitle>Action History</CardTitle>
            <CardDescription>Recent trading activity from this strategy.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionHistory address={leader.walletAddress} />
          </CardContent>
        </Card>

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
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="copy-amount">Amount to Deposit</Label>
                <Input
                  id="copy-amount"
                  type="number"
                  placeholder="0.00"
                  value={copyAmount}
                  onChange={(e) => setCopyAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-select">Token</Label>
                <Select 
                  value={selectedToken.symbol} 
                  onValueChange={(value) => {
                    const token = SUPPORTED_TOKENS.find(t => t.symbol === value);
                    if (token) {
                      setSelectedToken(token);
                      setCopyAmount('');
                    }
                  }}
                >
                  <SelectTrigger id="token-select" className="w-full">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_TOKENS.map((token) => (
                      <SelectItem key={token.address} value={token.symbol}>
                        <div className="flex items-center gap-2">
                          <img 
                            src={token.logoUrl} 
                            alt={token.symbol} 
                            className="w-4 h-4 rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cpath d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'%3E%3C/path%3E%3Cline x1='12' y1='17' x2='12.01' y2='17'%3E%3C/line%3E%3C/svg%3E";
                            }}
                          />
                          {token.symbol}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="p-3 bg-muted/40 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">You will deposit:</span>
                  <span className="font-medium">
                    {copyAmount ? parseFloat(copyAmount).toLocaleString() : '0.00'} {selectedToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your balance:</span>
                  <span className="font-medium">
                    {tokenBalance ? parseFloat(tokenBalance.formatted).toLocaleString() : '0.00'} {selectedToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Gas Fee:</span>
                  <span className="font-mono">~0.006 ETH</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              onClick={handleCopyConfirm} 
              disabled={!copyAmount || parseFloat(copyAmount) <= 0 || (tokenBalance && parseFloat(copyAmount) > parseFloat(tokenBalance.formatted))}
            >
              Confirm & Deposit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepositing} onOpenChange={resetCopyFlow}>
          <DialogContent hideCloseButton>
            <DialogHeader>
                <DialogTitle>{depositSuccess ? "Deposit Successful" : "Processing Deposit"}</DialogTitle>
            </DialogHeader>
              { !depositSuccess ? (
                <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                    <h3 className="text-xl font-bold">Processing Deposit</h3>
                    <p className="text-muted-foreground mb-2">{depositStep || currentTxStep}</p>
                    
                    {(depositTxHash || currentTxHash) && (
                      <div className="w-full bg-muted/50 rounded-lg p-3 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                        <div className="flex items-center gap-2 justify-center">
                          <p className="font-mono text-xs truncate">{currentTxHash}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(currentTxHash);
                              toast({
                                title: "Copied!",
                                description: "Transaction hash copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="w-full mt-4">
                      <div className="text-xs text-muted-foreground text-left mb-2">Copy Trading Process:</div>
                      <div className="space-y-3 text-sm text-left">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-full w-5 h-5 flex items-center justify-center ${
                            currentTxStep.includes('vault') ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            1
                          </div>
                          <span>Create or verify copy trading vault</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`rounded-full w-5 h-5 flex items-center justify-center ${
                            currentTxStep.includes('Approving') ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            2
                          </div>
                          <span>Approve {selectedToken.symbol} for deposit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`rounded-full w-5 h-5 flex items-center justify-center ${
                            currentTxStep.includes('Depositing') ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            3
                          </div>
                          <span>Deposit {selectedToken.symbol} to copy trading vault</span>
                        </div>
                      </div>
                    </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <h3 className="text-xl font-bold">Deposit Successful!</h3>
                    <p className="text-muted-foreground">You are now copying {leader.name}. You can track your new position from your portfolio.</p>
                    
                    {currentTxHash && (
                      <div className="w-full bg-muted/50 rounded-lg p-3 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Transaction Hash:</p>
                        <div className="flex items-center gap-2 justify-center">
                          <p className="font-mono text-xs truncate">{currentTxHash}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(currentTxHash);
                              toast({
                                title: "Copied!",
                                description: "Transaction hash copied to clipboard",
                              });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
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