
import type { LpPosition } from "@/app/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLpPositions } from "@/hooks/use-lp-positions";
import Link from "next/link";
import { useState } from "react";
import { RemoveLiquidityModal } from "./remove-liquidity-modal";

export function LpPositions({ externalPositions }: { externalPositions?: LpPosition[] }) {
  const { positions: fetchedPositions, isLoading, error } = useLpPositions();
  
  // Use external positions if provided, otherwise use fetched positions
  const positions = externalPositions || fetchedPositions;
  
  // State for remove liquidity modal
  const [selectedPosition, setSelectedPosition] = useState<LpPosition | null>(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  
  // Function to open remove modal for a position
  const openRemoveModal = (position: LpPosition) => {
    setSelectedPosition(position);
    setIsRemoveModalOpen(true);
  };
  const tribeStrategy = positions?.find(p => p.isTribeStrategy);
  const otherPositions = positions?.filter(p => !p.isTribeStrategy) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>LP Positions</CardTitle>
        <CardDescription>Overview of all your active LP positions on Base.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading your positions...</p>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4">
            <p className="text-destructive text-sm">Failed to load positions. Please try again later.</p>
          </div>
        )}
        
        {!isLoading && !error && positions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">You don't have any LP positions yet</p>
            <Link href="/pools/new">
              <Button>Create Position</Button>
            </Link>
          </div>
        )}
        
        {!isLoading && tribeStrategy && (
          <div>
            <h3 className="mb-2 font-medium text-primary">Active Tribe Strategy Position</h3>
            <Card className="bg-primary/10 border-primary/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Image src={tribeStrategy.pair[0].icon.imageUrl} alt={tribeStrategy.pair[0].name} width={32} height={32} className="rounded-full border-2 border-card" data-ai-hint={tribeStrategy.pair[0].icon.imageHint}/>
                      <Image src={tribeStrategy.pair[1].icon.imageUrl} alt={tribeStrategy.pair[1].name} width={32} height={32} className="rounded-full border-2 border-card" data-ai-hint={tribeStrategy.pair[1].icon.imageHint}/>
                    </div>
                    <div>
                      <p className="font-semibold">{tribeStrategy.pair[0].symbol}/{tribeStrategy.pair[1].symbol}</p>
                      <p className="text-sm text-muted-foreground">{tribeStrategy.protocol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">${tribeStrategy.value.toLocaleString()}</p>
                    {tribeStrategy.range && (
                       <Badge variant={tribeStrategy.range.inRange ? 'default' : 'destructive'} className={cn(tribeStrategy.range.inRange ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30", "hover:bg-transparent")}>{tribeStrategy.range.inRange ? 'In Range' : 'Out of Range'}</Badge>
                    )}
                  </div>
                </div>
                 <div className="flex gap-2 justify-end">
                    <Link href={`/pools/${tribeStrategy.id}`}>
                      <Button variant="secondary" size="xs" className="rounded-md">Add/Adjust Liquidity</Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="xs" 
                      className="rounded-md" 
                      onClick={() => openRemoveModal(tribeStrategy)}
                    >
                      Remove Liquidity
                    </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {otherPositions.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium">Other LP Positions</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead className="hidden sm:table-cell">Protocol</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherPositions.map(pos => (
                    <TableRow key={pos.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="flex -space-x-2">
                              <Image src={pos.pair[0]?.icon?.imageUrl || '/assets/images/tokens/eth.png'} alt={pos.pair[0]?.name || 'Unknown'} width={24} height={24} className="rounded-full border-2 border-card" data-ai-hint={pos.pair[0]?.icon?.imageHint || ''}/>
                              {pos.pair[1] ? (
                                <Image src={pos.pair[1].icon.imageUrl} alt={pos.pair[1].name} width={24} height={24} className="rounded-full border-2 border-card" data-ai-hint={pos.pair[1].icon.imageHint}/>
                              ) : (
                                <Image src={'/assets/images/tokens/eth.png'} alt={'Unknown'} width={24} height={24} className="rounded-full border-2 border-card" />
                              )}
                            </div>
                            <span className="font-medium">{pos.pair[0]?.symbol || 'Unknown'}/{pos.pair[1]?.symbol || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{pos.protocol}</TableCell>
                      <TableCell className="text-right">${pos.value.toLocaleString()}</TableCell>
                       <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/pools/${pos.id}`}>Adjust</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRemoveModal(pos)}>
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Remove Liquidity Modal */}
      <RemoveLiquidityModal 
        open={isRemoveModalOpen}
        onOpenChange={setIsRemoveModalOpen}
        position={selectedPosition}
        onRemoveSuccess={() => {
          // Force a refresh of positions by triggering a state update
          setSelectedPosition(null);
        }}
      />
    </Card>
  );
}
