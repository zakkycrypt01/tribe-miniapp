import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { removeLiquidity } from '@/lib/liquidity-utils';
import { useAccount } from 'wagmi';
import type { LpPosition } from "@/app/lib/types";
import Image from "next/image";

interface RemoveLiquidityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: LpPosition | null;
  onRemoveSuccess?: () => void;
}

export function RemoveLiquidityModal({ open, onOpenChange, position, onRemoveSuccess }: RemoveLiquidityModalProps) {
  const { address } = useAccount();
  const [percentage, setPercentage] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!position) return null;

  const handleRemove = async () => {
    if (!address || !position.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await removeLiquidity(
        position.id, 
        percentage,
        address as `0x${string}`
      );
      
      // Close dialog and refresh positions
      onOpenChange(false);
      onRemoveSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove liquidity');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Remove Liquidity</DialogTitle>
          <DialogDescription>
            Remove liquidity from your position. The tokens will be returned to your wallet.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 rounded-lg border p-3 bg-card/50">
            <div className="flex -space-x-2">
              <Image 
                src={position.pair[0]?.icon?.imageUrl || '/assets/images/tokens/eth.png'} 
                alt={position.pair[0]?.symbol || 'Unknown'} 
                width={32} 
                height={32} 
                className="rounded-full border-2 border-card" 
              />
              <Image 
                src={position.pair[1]?.icon?.imageUrl || '/assets/images/tokens/eth.png'} 
                alt={position.pair[1]?.symbol || 'Unknown'} 
                width={32} 
                height={32} 
                className="rounded-full border-2 border-card" 
              />
            </div>
            <div>
              <p className="font-semibold">{position.pair[0]?.symbol || 'Unknown'}/{position.pair[1]?.symbol || 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{position.protocol}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="font-semibold">${position.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Position Value</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="percentage" className="text-sm font-medium">
                Percentage to Remove
              </label>
              <span className="text-sm font-medium">{percentage}%</span>
            </div>
            <Slider 
              id="percentage" 
              min={1} 
              max={100} 
              step={1} 
              defaultValue={[percentage]} 
              onValueChange={(values) => setPercentage(values[0])} 
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleRemove} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove Liquidity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}