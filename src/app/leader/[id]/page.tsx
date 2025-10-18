
"use client";

import { getLeaderData, getLpPositions } from "@/app/lib/mock-data";
import { notFound, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Loader2 } from "lucide-react";
import { PerformanceChart } from "@/components/app/performance-chart";
import { LpPositions } from "@/components/app/lp-positions";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
  const id = typeof params.id === 'string' ? params.id : '';
  const leader = getLeaderData(id);
  const lpPositions = getLpPositions(id);
  
  const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
  const [copyAmount, setCopyAmount] = useState('');
  const { toast } = useToast();

  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  if (!leader) {
    notFound();
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
          <StatCard title="Total Fees Earned" value={`$${leader.totalFees.toLocaleString()}`} />
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
