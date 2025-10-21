
"use client";

import { useState, useEffect } from "react";
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
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import { useAccount } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi, parseUnits } from "viem";
import { config as wagmiConfig } from "@/components/providers/WagmiProvider";
import {
    calculateLiquidityPosition,
    getMintParams,
    calculateOptimalAmounts,
    getPoolAddress,
    USDC_TOKEN,
    WETH_TOKEN,
    WBTC_TOKEN,
    UNI_TOKEN,
    NONFUNGIBLE_POSITION_MANAGER,
} from "@/lib/lpcheck";


// Temporary token address/decimals map for Base Sepolia
// Note: ETH is treated as WETH
const TOKEN_ADDRESSES: Record<string, `0x${string}` | undefined> = {
    ETH: '0x4200000000000000000000000000000000000006',
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    WBTC: '0xcbB7C0006F23900c38EB856149F799620fcb8A4a',
    UNI: '0xB62b54F9b13F3bE72A65117a705c930e42563ab4',
};

const TOKEN_DECIMALS: Record<string, number> = {
    ETH: 18,
    WETH: 18,
    USDC: 6,
    WBTC: 8,
    UNI: 18,
};

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
    const [calculatedPosition, setCalculatedPosition] = useState<any | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [marketPrice, setMarketPrice] = useState<number | null>(null);
    const [isFetchingMarketPrice, setIsFetchingMarketPrice] = useState(false);
    const [creationStep, setCreationStep] = useState<CreationStep>('review');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState<number | 'Infinity'>('Infinity');

    const token1 = tokens.find(t => t.symbol === token1Symbol)!;
    const token2 = tokens.find(t => t.symbol === token2Symbol)!;

    const { address } = useAccount();

    const createUniswapV3Position = async () => {
        if (!address) throw new Error('Wallet not connected');
        const symA = token1Symbol;
        const symB = token2Symbol;
        const addrA = TOKEN_ADDRESSES[symA] as `0x${string}` | undefined;
        const addrB = TOKEN_ADDRESSES[symB] as `0x${string}` | undefined;
        if (!addrA || !addrB) throw new Error('Unsupported token');
        const decA = TOKEN_DECIMALS[symA] ?? 18;
        const decB = TOKEN_DECIMALS[symB] ?? 18;

        const amtA = parseUnits((amount1 || '0') as `${number}` as unknown as string, decA);
        const amtB = parseUnits((amount2 || '0') as `${number}` as unknown as string, decB);
        if (amtA === 0n || amtB === 0n) throw new Error('Amounts must be greater than zero');

        const token0 = addrA.toLowerCase() < addrB.toLowerCase() ? addrA : addrB;
        const token1 = token0 === addrA ? addrB : addrA;
        const amount0Desired = token0 === addrA ? amtA : amtB;
        const amount1Desired = token0 === addrA ? amtB : amtA;

        // Fee tier fixed to 0.3% for now
        const fee: 3000 = 3000;
        const tickLower: -887220 = -887220;
        const tickUpper: 887220 = 887220;

        const approve0Hash = await writeContract(wagmiConfig, {
            abi: erc20Abi,
            address: token0,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER as `0x${string}`, amount0Desired],
            account: address,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approve0Hash });

        const approve1Hash = await writeContract(wagmiConfig, {
            abi: erc20Abi,
            address: token1,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER as `0x${string}`, amount1Desired],
            account: address,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approve1Hash });

        const txHash = await writeContract(wagmiConfig, {
            abi: ABIS.TribeUniswapV3Adapter,
            address: CONTRACT_ADDRESSES.UNISWAP_V3_ADAPTER as `0x${string}`,
            functionName: 'mintPosition',
            args: [
                token0,
                token1,
                fee,
                tickLower,
                tickUpper,
                amount0Desired,
                amount1Desired,
                0n,
                0n,
                address,
            ],
            account: address,
        });
        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
        return receipt;
    };

    // Auto-convert handlers
    const formatDisplayAmount = (amt: number, decimals: number) => {
        if (!isFinite(amt) || isNaN(amt)) return '';
        const displayDigits = decimals <= 6 ? 2 : 6;
        return Number(amt.toFixed(displayDigits)).toString();
    };

    const handleAmount1Change = (value: string) => {
        setAmount1(value);
        const n = Number(value);
        if (!marketPrice || !isFinite(n) || isNaN(n)) {
            setAmount2('');
            return;
        }
        const dec2 = TOKEN_DECIMALS[token2Symbol] ?? 18;
        const converted = n * marketPrice;
        setAmount2(formatDisplayAmount(converted, dec2));
    };

    const handleAmount2Change = (value: string) => {
        setAmount2(value);
        const n = Number(value);
        if (!marketPrice || !isFinite(n) || isNaN(n) || marketPrice === 0) {
            setAmount1('');
            return;
        }
        const dec1 = TOKEN_DECIMALS[token1Symbol] ?? 18;
        const converted = n / marketPrice;
        setAmount1(formatDisplayAmount(converted, dec1));
    };

    const handleCreate = async () => {
        try {
            setCreationStep('approving');
            setCreationStep('confirming');
            await createUniswapV3Position();
            setCreationStep('complete');
        } catch (e) {
            console.error(e);
            setCreationStep('review');
        }
    }
    
    const resetDialog = () => {
        setShowReviewDialog(false);
        setTimeout(() => {
            setCreationStep('review');
            setCalculatedPosition(null);
            setIsCalculating(false);
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
            return Math.max(0, parseFloat(newPrice.toFixed(2)));
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

    useEffect(() => {
        if (!showReviewDialog) return;

        const runCalc = async () => {
            try {
                setIsCalculating(true);

                // Map selected symbols to Uniswap Token objects exported from lpcheck
                let tokenA: any | null = null;
                let tokenB: any | null = null;

                // Prefer the exported constants for common tokens
                const mapBySymbol = (sym: string) => {
                    if (sym === 'USDC') return USDC_TOKEN;
                    if (sym === 'WETH' || sym === 'ETH') return WETH_TOKEN;
                    if (sym === 'WBTC') return WBTC_TOKEN;
                    if (sym === 'UNI') return UNI_TOKEN;
                    return null;
                };

                tokenA = mapBySymbol(token1Symbol);
                tokenB = mapBySymbol(token2Symbol);

                if (!tokenA || !tokenB) {
                    // Unsupported tokens for on-chain calculation in this demo
                    setCalculatedPosition({ error: 'Token pair not supported for on-chain calculation in demo' });
                    setIsCalculating(false);
                    return;
                }

                const params = {
                    token0: tokenA,
                    token1: tokenB,
                    fee: 3000,
                    amount0: amount1 || '0',
                    amount1: amount2 || '0',
                };

                const pos = await calculateLiquidityPosition(params);
                setCalculatedPosition(pos);
            } catch (e) {
                console.error('Error calculating position:', e);
                setCalculatedPosition({ error: String(e) });
            } finally {
                setIsCalculating(false);
            }
        };

        runCalc();
    }, [showReviewDialog, token1Symbol, token2Symbol, amount1, amount2]);

    // Update market price when tokens or calculated position changes
    useEffect(() => {
        // If we have a calculated position, try to use its currentPrice
        if (calculatedPosition && calculatedPosition.currentPrice) {
            const parsed = Number(calculatedPosition.currentPrice);
            if (!isNaN(parsed)) {
                setMarketPrice(parsed);
                return;
            }
        }

        // If no calculated price available, mark as unavailable
        setMarketPrice(null);
    }, [token1Symbol, token2Symbol, calculatedPosition]);


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
                                                <Button size="lg" className="w-full h-12 text-base" onClick={() => setCurrentStep(2)} disabled={marketPrice === null}>Continue</Button>
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
                                                            <p className="text-xs text-muted-foreground">Market price: {marketPrice ? `${marketPrice} ${token2.symbol} per ${token1.symbol}` : '—'}</p>
                                                                <p className="text-xs text-muted-foreground">Market price: {marketPrice ? `${marketPrice} ${token2.symbol} per ${token1.symbol}` : 'Not available'}</p>
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
                                                    <AmountInput token={token1} value={amount1} onChange={handleAmount1Change} />
                                                    <AmountInput token={token2} value={amount2} onChange={handleAmount2Change} />

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
                                <div className="mt-4">
                                    <h4 className="text-sm text-muted-foreground mb-1">Estimated position</h4>
                                    {isCalculating ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" /> Calculating on-chain estimates...
                                        </div>
                                    ) : calculatedPosition ? (
                                        calculatedPosition.error ? (
                                            <p className="text-sm text-destructive">{calculatedPosition.error}</p>
                                        ) : (
                                            <div className="text-sm">
                                                <div className="flex justify-between">
                                                    <span>Amount {token1.symbol}</span>
                                                    <span className="font-medium">{calculatedPosition.amount0}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Amount {token2.symbol}</span>
                                                    <span className="font-medium">{calculatedPosition.amount1}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Liquidity</span>
                                                    <span className="font-medium">{calculatedPosition.liquidity}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Tick range</span>
                                                    <span className="font-medium">{calculatedPosition.tickLower} — {calculatedPosition.tickUpper}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Current price</span>
                                                    <span className="font-medium">{calculatedPosition.currentPrice}</span>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No estimation available</p>
                                    )}
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

    
