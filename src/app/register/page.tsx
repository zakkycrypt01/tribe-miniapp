
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Loader, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base } from "wagmi/chains";

type Step = 'connect' | 'analyze' | 'qualify' | 'fail' | 'define' | 'confirm';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('connect');
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [performanceFee, setPerformanceFee] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Wagmi hooks for contract write
  const { address, isConnected, chainId } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const { writeContract, isPending: isRegistering, error: registerError, reset: resetRegister } = useWriteContract();
  const { isLoading: isTxPending, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  const handleAnalyze = () => {
    setStep('analyze');
    // Simulate analysis
    setTimeout(() => {
      // Simulate 80%+ profitable positions
      const isQualified = Math.random() > 0.1; 
      setStep(isQualified ? 'qualify' : 'fail');
    }, 2000);
  };

  const handleDefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (strategyName && strategyDescription && performanceFee) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirm = () => {
    if (!isConnected) {
      alert("Please connect your wallet.");
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
      abi: ABIS.TribeLeaderRegistry,
      functionName: 'registerAsLeader',
      args: [strategyName, strategyDescription, Number(performanceFee)],
      chainId: base.id,
    });
    setShowConfirmDialog(false);
    setStep('confirm');
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6">
  <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Become a Lead Trader</CardTitle>
          <CardDescription>
            {step === 'connect' && "Start by connecting your wallet to analyze your performance."}
            {step === 'analyze' && "Analyzing your wallet's historical LP activity on Base..."}
            {step === 'qualify' && "You've qualified! Now, define your trading strategy."}
            {step === 'fail' && "You don't meet the minimum performance requirements yet."}
            {step === 'define' && "Define the details of your new copy-trading strategy."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show registration tx status if in confirm step */}
          {step === 'confirm' && (
            <div className="flex flex-col items-center space-y-4 text-center">
              {isRegistering || isTxPending ? (
                <>
                  <Loader className="h-12 w-12 animate-spin text-primary" />
                  <p className="font-semibold">Registering on-chain...</p>
                  <p className="text-sm text-muted-foreground">Please confirm the transaction in your wallet.</p>
                </>
              ) : isTxConfirmed ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                  <h3 className="text-xl font-bold">Congratulations!</h3>
                  <p className="text-muted-foreground">You are now a Lead Trader.</p>
                </>
              ) : registerError ? (
                <>
                  <XCircle className="h-16 w-16 text-destructive mx-auto" />
                  <h3 className="text-xl font-bold">Registration Failed</h3>
                  <p className="text-muted-foreground">{registerError.message}</p>
                  <Button onClick={() => { resetRegister(); setStep('define'); setTxHash(undefined); }} size="lg" className="w-full" variant="secondary">Try Again</Button>
                </>
              ) : null}
            </div>
          )}
          {step === 'connect' && (
            <div className="flex flex-col items-center space-y-4">
                <p className="text-sm text-center text-muted-foreground">We'll analyze your wallet for a verifiable track record of at least 80% net profitable LP positions, accounting for Impermanent Loss and gas costs.</p>
                <Button onClick={handleAnalyze} size="lg" className="w-full">Analyze Wallet</Button>
            </div>
          )}

          {step === 'analyze' && (
            <div className="flex flex-col items-center space-y-4 text-center">
              <Loader className="h-12 w-12 animate-spin text-primary" />
              <p className="font-semibold">Analyzing Performance...</p>
              <p className="text-sm text-muted-foreground">This may take a moment.</p>
            </div>
          )}

          {step === 'qualify' && (
            <div className="flex flex-col items-center space-y-6 text-center">
                <div className="space-y-2">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                    <h3 className="text-xl font-bold">Qualification Successful!</h3>
                    <p className="text-muted-foreground">You meet the requirement of &gt;80% net profitable positions.</p>
                </div>
              <Button onClick={() => setStep('define')} size="lg" className="w-full">Proceed to Strategy Definition</Button>
            </div>
          )}
          
          {step === 'fail' && (
             <div className="flex flex-col items-center space-y-6 text-center">
                <div className="space-y-2">
                    <XCircle className="h-16 w-16 text-destructive mx-auto" />
                    <h3 className="text-xl font-bold">Qualification Failed</h3>
                    <p className="text-muted-foreground">Your wallet does not meet the minimum requirement of 80% net profitable LP positions. Keep trading and try again later.</p>
                </div>
              <Button onClick={() => setStep('connect')} size="lg" className="w-full" variant="secondary">Try Again</Button>
            </div>
          )}

          {step === 'define' && (
            <form onSubmit={handleDefineSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="strategy-name">Strategy Name</Label>
                <Input
                  id="strategy-name"
                  placeholder="e.g., Stablecoin Growth Engine"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategy-description">Strategy Description</Label>
                <Textarea
                  id="strategy-description"
                  placeholder="Describe your approach, risk level, and target pairs."
                  value={strategyDescription}
                  onChange={(e) => setStrategyDescription(e.target.value)}
                  required
                  className="min-h-[120px]"
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="performance-fee">Performance Fee (%)</Label>
                <Input
                  id="performance-fee"
                  type="number"
                  placeholder="e.g., 15"
                  value={performanceFee}
                  onChange={(e) => setPerformanceFee(e.target.value)}
                  required
                  min="0"
                  max="100"
                />
                <p className="text-xs text-muted-foreground">The percentage of follower profits you will collect as a fee.</p>
              </div>
              <Button type="submit" size="lg" className="w-full">Finalize Strategy</Button>
            </form>
          )}
        </CardContent>
      </Card>

  <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Strategy</AlertDialogTitle>
            <AlertDialogDescription>
              Review your strategy details below. This will be published on-chain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4 text-sm">
             <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Strategy Name</p>
                <p className="font-semibold">{strategyName}</p>
             </div>
              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Strategy Description</p>
                <p className="text-muted-foreground">{strategyDescription}</p>
             </div>
             <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Performance Fee</p>
                <p className="font-semibold">{performanceFee}%</p>
             </div>
             <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Estimated Gas Cost</p>
                <p className="font-mono text-muted-foreground">~0.0085 ETH</p>
             </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isRegistering || isTxPending}>Confirm & Register</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
