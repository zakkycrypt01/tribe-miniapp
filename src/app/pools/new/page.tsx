
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stepper, Step } from "@/components/ui/stepper";
import { getTokens } from "@/app/lib/mock-data";
import type { Token } from "@/app/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Edit, Settings, Plus, Minus, X, AreaChart, Loader2, CheckCircle, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";


const TokenSelector = ({ tokens, value, onChange }: { tokens: Token[], value?: string, onChange: (value: string) => void }) => {
    const selectedToken = tokens.find(t => t.symbol === value);
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-14 bg-card border-border">
                <SelectValue asChild>
                     {selectedToken ? (
                        <div className="flex items-center gap-2">
                            <Image src={selectedToken.icon.imageUrl} alt={selectedToken.name} width={28} height={28} className="rounded-full" data-ai-hint={selectedToken.icon.imageHint}/>
                            <span className="text-lg font-medium">{selectedToken.symbol}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Select Token</span>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {tokens.map(token => (
                  <SelectItem key={token.id} value={token.symbol}>
                    <div className="flex items-center gap-2">
                      <Image src={token.icon.imageUrl} alt={token.name} width={20} height={20} className="rounded-full" data-ai-hint={token.icon.imageHint}/>
                      {token.symbol}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

const AmountInput = ({ token, value, onChange }: { token: Token, value: string, onChange: (value: string) => void }) => {
    return (
        <div className="bg-card/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <Input 
                    type="number"
                    placeholder="0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="bg-transparent text-3xl font-medium p-0 focus-visible:ring-0"
                />
                 <div className="flex items-center gap-2">
                    <Image src={token.icon.imageUrl} alt={token.name} width={28} height={28} className="rounded-full" data-ai-hint={token.icon.imageHint}/>
                    <span className="text-xl font-medium">{token.symbol}</span>
                </div>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>${(parseFloat(value) * 3847.39 / (token.symbol === 'ETH' ? 1 : 3847.39)).toFixed(2) || '0.00'}</span>
                <span>Balance: 0.00</span>
            </div>
        </div>
    )
}

type CreationStep = 'review' | 'approving' | 'confirming' | 'complete';

export default function NewPositionPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const router = useRouter();
    const steps = [
        { id: 1, name: 'Select token pair and fees' },
        { id: 2, name: 'Set price range and deposit amounts' }
    ];
    const tokens = getTokens();

    const [token1Symbol, setToken1Symbol] = useState('USDC');
    const [token2Symbol, setToken2Symbol] = useState('ETH');
    const [amount1, setAmount1] = useState('');
    const [amount2, setAmount2] = useState('');
    const [rangeType, setRangeType] = useState('custom');
    const [showReviewDialog, setShowReviewDialog] = useState(false);
    const [creationStep, setCreationStep] = useState<CreationStep>('review');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState<number | 'Infinity'>('Infinity');

    const token1 = tokens.find(t => t.symbol === token1Symbol)!;
    const token2 = tokens.find(t => t.symbol === token2Symbol)!;

    const handleCreate = () => {
        setCreationStep('approving');
        setTimeout(() => {
            setCreationStep('confirming');
             setTimeout(() => {
                setCreationStep('complete');
            }, 3000);
        }, 3000);
    }
    
    const resetDialog = () => {
        setShowReviewDialog(false);
        setTimeout(() => {
            setCreationStep('review');
        }, 500);
    }

    const handleDone = () => {
        resetDialog();
        router.push('/portfolio');
    }
    
    const handleMinPriceChange = (increment: boolean) => {
        const step = 0.1;
        setMinPrice(prev => {
            const newPrice = increment ? prev + step : prev - step;
            return Math.max(0, parseFloat(newPrice.toFixed(2))); // Ensure price doesn't go below 0
        });
    };
    
    const handleMaxPriceChange = (increment: boolean) => {
        const step = 0.1;
        setMaxPrice(prev => {
            if (prev === 'Infinity') {
                return 10;
            }
            const newPrice = increment ? prev + step : prev - step;
            return parseFloat(newPrice.toFixed(2));
        });
    };


    return (
        <>
            <main className="flex-1 p-4 md:p-6 lg:p-10">
                <div className="max-w-4xl mx-auto">
                    <div className="text-sm text-muted-foreground mb-4">
                        <Link href="/portfolio" className="hover:underline">Your positions</Link> &gt; New position
                    </div>
                    
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold">New position</h1>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">Reset</Button>
                            <Select defaultValue="v3">
                                <SelectTrigger className="w-[120px] h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="v2">v2 position</SelectItem>
                                    <SelectItem value="v3">v3 position</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon"><Settings className="size-5" /></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1">
                            <Stepper>
                                {steps.map(step => (
                                    <Step key={step.id} isCompleted={currentStep > step.id} isActive={currentStep === step.id}>
                                        <span className="text-xs">Step {step.id}</span>
                                        <p className="text-sm font-medium">{step.name}</p>
                                    </Step>
                                ))}
                            </Stepper>
                        </div>

                        <div className="md:col-span-2">
                            
                                
                                    {currentStep === 1 && (
                                        <Card className="bg-card/50">
                                            <CardContent className="p-6 space-y-6">
                                                <div>
                                                    <h3 className="font-semibold mb-1">Select pair</h3>
                                                    <p className="text-sm text-muted-foreground">Choose the tokens you want to provide liquidity for. You can select tokens on all supported networks.</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <TokenSelector tokens={tokens} value={token1Symbol} onChange={setToken1Symbol} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <TokenSelector tokens={tokens} value={token2Symbol} onChange={setToken2Symbol} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold mb-1">Fee tier</h3>
                                                    <p className="text-sm text-muted-foreground">The amount earned providing liquidity. All v2 pools have fixed 0.3% fees. For more options, provide liquidity on v3.</p>
                                                </div>
                                                <Button size="lg" className="w-full h-12 text-base" onClick={() => setCurrentStep(2)}>Continue</Button>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {currentStep === 2 && (
                                        <div className="space-y-6">
                                            <Card className="bg-card/50">
                                                <CardContent className="p-4 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex -space-x-2">
                                                            <Image src={token1.icon.imageUrl} alt={token1.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                                                            <Image src={token2.icon.imageUrl} alt={token2.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token2.icon.imageHint}/>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-lg">{token1.symbol} / {token2.symbol}</p>
                                                            <p className="text-xs text-muted-foreground">Market price: 0.00006 WETH = 1 USDC ($1.64)</p>
                                                        </div>
                                                        <Badge variant="secondary">v3</Badge>
                                                        <Badge variant="secondary">0.3%</Badge>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-card/50">
                                                <CardHeader>
                                                    <CardTitle>Set price range</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-md">
                                                        <Button variant={rangeType === 'full' ? 'secondary' : 'ghost'} onClick={() => setRangeType('full')}>Full range</Button>
                                                        <Button variant={rangeType === 'custom' ? 'secondary' : 'ghost'} onClick={() => setRangeType('custom')}>Custom range</Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">Custom range allows you to concentrate your liquidity within specific price bounds, enhancing capital efficiency and fee earnings but requiring more active management.</p>
                                                    
                                                    <div className="h-64 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                                                        Price Chart Placeholder
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 bg-muted rounded-md text-center">
                                                            <p className="text-xs text-muted-foreground">Min price</p>
                                                            <p className="text-lg font-bold">{minPrice}</p>
                                                            <p className="text-xs">{token2.symbol} per {token1.symbol}</p>
                                                            <div className="flex justify-center gap-2 mt-2">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => handleMinPriceChange(true)}><Plus className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => handleMinPriceChange(false)}><Minus className="h-4 w-4" /></Button>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-muted rounded-md text-center">
                                                            <p className="text-xs text-muted-foreground">Max price</p>
                                                            <p className="text-lg font-bold">{maxPrice === 'Infinity' ? '∞' : maxPrice}</p>
                                                            <p className="text-xs">{token2.symbol} per {token1.symbol}</p>
                                                            <div className="flex justify-center gap-2 mt-2">
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => handleMaxPriceChange(true)}><Plus className="h-4 w-4" /></Button>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background" onClick={() => handleMaxPriceChange(false)}><Minus className="h-4 w-4" /></Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                            <Card className="bg-card/50">
                                                <CardHeader>
                                                    <CardTitle>Deposit tokens</CardTitle>
                                                    <CardDescription>Specify the token amounts for your liquidity contribution.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <AmountInput token={token1} value={amount1} onChange={setAmount1} />
                                                    <AmountInput token={token2} value={amount2} onChange={setAmount2} />

                                                    <Button size="lg" className="w-full h-12 text-base" disabled={!amount1 || !amount2} onClick={() => setShowReviewDialog(true)}>
                                                        {!amount1 || !amount2 ? "Enter an amount" : "Review"}
                                                    </Button>

                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                
                            
                        </div>
                    </div>
                </div>
            </main>

            <Dialog open={showReviewDialog} onOpenChange={resetDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader className="flex-row items-center justify-between">
                        <DialogTitle className="text-base">Creating position</DialogTitle>
                         <div className="flex items-center gap-2">
                             <Button variant="outline" size="sm">Get help</Button>
                             <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><X className="h-4 w-4" /></Button>
                            </DialogClose>
                         </div>
                    </DialogHeader>

                    {creationStep === 'review' && (
                        <div className="space-y-6 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                    <Image src={token1.icon.imageUrl} alt={token1.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                                    <Image src={token2.icon.imageUrl} alt={token2.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token2.icon.imageHint}/>
                                </div>
                                <h2 className="text-2xl font-bold">{token1.symbol} / {token2.symbol}</h2>
                                <Badge variant="secondary">v3</Badge>
                                <Badge variant="secondary">0.3%</Badge>
                            </div>
                            
                            <div className="h-24 bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground">
                                <AreaChart className="w-48 h-20 text-primary" />
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-muted-foreground">Min</p>
                                    <p className="font-semibold">{minPrice} {token2.symbol}/{token1.symbol}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Max</p>
                                    <p className="font-semibold">{maxPrice === 'Infinity' ? '∞' : maxPrice} {token2.symbol}/{token1.symbol}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm text-muted-foreground mb-2">Depositing</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Image src={token1.icon.imageUrl} alt={token1.name} width={24} height={24} className="rounded-full" data-ai-hint={token1.icon.imageHint}/>
                                            <div>
                                                <p className="font-semibold">{amount1} {token1.symbol}</p>
                                                <p className="text-xs text-muted-foreground">${(parseFloat(amount1) * 1).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Image src={token2.icon.imageUrl} alt={token2.name} width={24} height={24} className="rounded-full" data-ai-hint={token2.icon.imageHint}/>
                                            <div>
                                                <p className="font-semibold">{amount2} {token2.symbol}</p>
                                                <p className="text-xs text-muted-foreground">${(parseFloat(amount2) * 3847.39).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center text-sm">
                                    <p className="text-muted-foreground">Network cost</p>
                                    <p className="font-semibold">$2.14</p>
                                </div>
                            </div>

                            <Button size="lg" className="w-full h-12 text-base" onClick={handleCreate}>Create</Button>
                        </div>
                    )}
                    
                    {creationStep !== 'review' && (
                         <div className="space-y-6 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                    <Image src={token1.icon.imageUrl} alt={token1.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                                    <Image src={token2.icon.imageUrl} alt={token2.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token2.icon.imageHint}/>
                                </div>
                                <h2 className="text-2xl font-bold">{token1.symbol} / {token2.symbol}</h2>
                            </div>
                            
                            <div className="h-24 bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground">
                                <AreaChart className="w-48 h-20 text-primary" />
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex items-start gap-4">
                                    {creationStep === 'approving' ? (
                                        <Loader2 className="size-5 text-primary animate-spin mt-1" />
                                    ) : (
                                        <CheckCircle className="size-5 text-primary mt-1" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold">Approve in wallet</p>
                                        <a href="#" className="text-xs text-primary hover:underline">Why do I have to approve a token?</a>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                 <div className="flex items-start gap-4">
                                    {creationStep === 'approving' ? (
                                         <Circle className="size-5 text-muted-foreground mt-1" />
                                    ) : creationStep === 'confirming' ? (
                                        <Loader2 className="size-5 text-primary animate-spin mt-1" />
                                    ): (
                                        <CheckCircle className="size-5 text-primary mt-1" />
                                    )}
                                    <div className={cn("flex-1", creationStep === 'approving' && "opacity-50")}>
                                        <p className="font-semibold">Confirm in wallet</p>
                                    </div>
                                </div>
                            </div>

                            {creationStep === 'complete' && (
                                <Button size="lg" className="w-full h-12 text-base" onClick={handleDone}>Done</Button>
                            )}
                         </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

    
