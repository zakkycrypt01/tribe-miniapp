
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stepper, Step } from "@/components/ui/stepper";
import { getTokens, getUniswapPoolData, getUniswapPools } from "@/app/lib/mock-data";
import { useSearchParams } from 'next/navigation';
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
import { useAccount, usePublicClient } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { erc20Abi, parseUnits, formatUnits } from "viem";
import { config as wagmiConfig } from "@/components/providers/WagmiProvider";
import {
    calculateLiquidityPosition,
    getMintParams,
    calculateOptimalAmounts,
    getPoolAddress,
    findPoolForPair,
    FEE_TIERS,
    findAllPoolsForPair,
    computeTicksFromPrices,
    USDC_TOKEN,
    WETH_TOKEN,
    WBTC_TOKEN,
    UNI_TOKEN,
    NONFUNGIBLE_POSITION_MANAGER,
} from "@/lib/lpcheck";

import { formatDisplayAmount as _formatDisplayAmount, convertBaseToQuote, convertQuoteToBase } from '@/lib/amount-utils';


// Token addresses/decimals will be derived from Uniswap SDK Token objects (no hardcoded maps)

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

const AmountInput = ({ token, value, onChange, marketPrice, otherSymbol, isBase, onFocus, balance }: { token: Token, value: string, onChange: (value: string) => void, marketPrice?: number | null, otherSymbol?: string, isBase?: boolean, onFocus?: () => void, balance?: string | null }) => {
    // marketPrice is expressed as otherSymbol per base token (token2 per token1)
    let convertedLabel = '—';
    const n = Number(value);
    if (marketPrice && isFinite(n)) {
        if (isBase) {
            // show equivalent in otherSymbol
            convertedLabel = `${(n * marketPrice).toFixed(6)} ${otherSymbol}`;
        } else {
            // show equivalent in base token
            convertedLabel = marketPrice !== 0 ? `${(n / marketPrice).toFixed(6)} ${otherSymbol}` : '—';
        }
    }

    return (
        <div className="bg-card/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <Input 
                    type="number"
                    placeholder="0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => onFocus && onFocus()}
                    className="bg-transparent text-3xl font-medium p-0 focus-visible:ring-0"
                />
                 <div className="flex items-center gap-2">
                    <Image src={token.icon.imageUrl} alt={token.name} width={28} height={28} className="rounded-full" data-ai-hint={token.icon.imageHint}/>
                    <span className="text-xl font-medium">{token.symbol}</span>
                </div>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{convertedLabel}</span>
                <span>Balance: {balance ?? '—'}</span>
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
    const searchParams = useSearchParams();
    const poolParam = searchParams ? searchParams.get('pool') : null;

    // Helper to map UI symbol to Uniswap SDK Token objects
    const mapBySymbol = (sym: string) => {
        if (sym === 'USDC') return USDC_TOKEN;
        if (sym === 'WETH' || sym === 'ETH') return WETH_TOKEN;
        if (sym === 'WBTC') return WBTC_TOKEN;
        if (sym === 'UNI') return UNI_TOKEN;
        return null;
    };

    const [token1Symbol, setToken1Symbol] = useState('USDC');
    const [token2Symbol, setToken2Symbol] = useState('ETH');
    const [amount1, setAmount1] = useState('');
    const [amount2, setAmount2] = useState('');
    // track which input was last edited to avoid conversion loops
    const [lastEdited, setLastEdited] = useState<'amount1' | 'amount2' | null>(null);
    const [rangeType, setRangeType] = useState('custom');
    const [showReviewDialog, setShowReviewDialog] = useState(false);
    const [calculatedPosition, setCalculatedPosition] = useState<any | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [marketPrice, setMarketPrice] = useState<number | null>(null);
    const [isFetchingMarketPrice, setIsFetchingMarketPrice] = useState(false);
    const [poolAddress, setPoolAddress] = useState<string | null>(null);
    const [isFetchingPoolAddress, setIsFetchingPoolAddress] = useState(false);
    const [detectedFee, setDetectedFee] = useState<number | null>(null);
    const [availableFeePools, setAvailableFeePools] = useState<Array<{ fee: number; poolAddress: string }>>([]);
    const [selectedFee, setSelectedFee] = useState<number | null>(null);
    const [computedTickLower, setComputedTickLower] = useState<number | null>(null);
    const [computedTickUpper, setComputedTickUpper] = useState<number | null>(null);

    const feeToUse = selectedFee ?? detectedFee ?? 3000;
    const [creationStep, setCreationStep] = useState<CreationStep>('review');
    const [minPrice, setMinPrice] = useState(0);
    const [maxPrice, setMaxPrice] = useState<number | 'Infinity'>('Infinity');

    const token1 = tokens.find(t => t.symbol === token1Symbol)!;
    const token2 = tokens.find(t => t.symbol === token2Symbol)!;

    const { address } = useAccount();
    const publicClient = usePublicClient();

    const [preflightError, setPreflightError] = useState<string | null>(null);
    const [balance1, setBalance1] = useState<string | null>(null);
    const [balance2, setBalance2] = useState<string | null>(null);

    const createUniswapV3Position = async () => {
        if (!address) throw new Error('Wallet not connected');
        const symA = token1Symbol;
        const symB = token2Symbol;
        const tokenAObj = mapBySymbol(symA);
        const tokenBObj = mapBySymbol(symB);
        if (!tokenAObj || !tokenBObj) throw new Error('Unsupported token');

        const addrA = tokenAObj.address as `0x${string}`;
        const addrB = tokenBObj.address as `0x${string}`;
        const decA = tokenAObj.decimals ?? 18;
        const decB = tokenBObj.decimals ?? 18;

        const amtA = parseUnits((amount1 || '0') as `${number}` as unknown as string, decA);
        const amtB = parseUnits((amount2 || '0') as `${number}` as unknown as string, decB);
        if (amtA === 0n || amtB === 0n) throw new Error('Amounts must be greater than zero');

        const token0 = addrA.toLowerCase() < addrB.toLowerCase() ? addrA : addrB;
        const token1 = token0 === addrA ? addrB : addrA;
        let amount0Desired = token0 === addrA ? amtA : amtB;
        let amount1Desired = token0 === addrA ? amtB : amtA;

        // If one side is zero, attempt to compute the optimal counterpart using SDK

        if (tokenAObj && tokenBObj) {
            // Determine pool token ordering
            const token0Obj = tokenAObj.sortsBefore(tokenBObj) ? tokenAObj : tokenBObj;
            const token1Obj = token0Obj === tokenAObj ? tokenBObj : tokenAObj;

            if ((amtA === 0n && amtB > 0n) || (amtB === 0n && amtA > 0n)) {
                try {
                    // tokenIn is the one user supplied
                    const isAInput = amtA > 0n;
                    const tokenInObj = isAInput ? tokenAObj : tokenBObj;
                    const tokenOutObj = isAInput ? tokenBObj : tokenAObj;
                    const amountIn = isAInput ? (amount1 || '0') : (amount2 || '0');

                    const optimal = await calculateOptimalAmounts(
                        tokenInObj,
                        tokenOutObj,
                        feeToUse,
                        amountIn
                    );

                    // optimal.amount0/amount1 correspond to pool token0 & token1
                    const parsed0 = parseUnits(optimal.amount0, token0Obj.decimals);
                    const parsed1 = parseUnits(optimal.amount1, token1Obj.decimals);

                    // Map parsed0/parsed1 back to amount0Desired/amount1Desired based on token0 address
                    if (token0Obj.address.toLowerCase() === addrA.toLowerCase()) {
                        amount0Desired = parsed0;
                        amount1Desired = parsed1;
                    } else {
                        amount0Desired = parsed1;
                        amount1Desired = parsed0;
                    }
                } catch (e) {
                    console.warn('Failed to compute optimal amounts:', e);
                }
            }
        }

    // Fee tier auto-detected from available pools (fallback to 0.3% if not found)
    const fee: number = feeToUse;
    // Use computed ticks if available, otherwise fall back to full range
    const tickLower = computedTickLower ?? -887220;
    const tickUpper = computedTickUpper ?? 887220;

        // Approve the Nonfungible Position Manager (match the solidity script)
        const approve0Hash = await writeContract(wagmiConfig, {
            abi: erc20Abi,
            address: token0,
            functionName: 'approve',
            args: [NONFUNGIBLE_POSITION_MANAGER as `0x${string}`, amount0Desired],
            account: address,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approve0Hash });

        const approve1Hash = await writeContract(wagmiConfig, {
            abi: erc20Abi,
            address: token1,
            functionName: 'approve',
            args: [NONFUNGIBLE_POSITION_MANAGER as `0x${string}`, amount1Desired],
            account: address,
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approve1Hash });

        // Build mint params and call the NonfungiblePositionManager directly (like the solidity script)
        const NONFUNGIBLE_POSITION_MANAGER_ABI = [
            {
                inputs: [
                    {
                        components: [
                            { internalType: 'address', name: 'token0', type: 'address' },
                            { internalType: 'address', name: 'token1', type: 'address' },
                            { internalType: 'uint24', name: 'fee', type: 'uint24' },
                            { internalType: 'int24', name: 'tickLower', type: 'int24' },
                            { internalType: 'int24', name: 'tickUpper', type: 'int24' },
                            { internalType: 'uint256', name: 'amount0Desired', type: 'uint256' },
                            { internalType: 'uint256', name: 'amount1Desired', type: 'uint256' },
                            { internalType: 'uint256', name: 'amount0Min', type: 'uint256' },
                            { internalType: 'uint256', name: 'amount1Min', type: 'uint256' },
                            { internalType: 'address', name: 'recipient', type: 'address' },
                            { internalType: 'uint256', name: 'deadline', type: 'uint256' },
                        ],
                        internalType: 'struct INonfungiblePositionManager.MintParams',
                        name: 'params',
                        type: 'tuple',
                    },
                ],
                name: 'mint',
                outputs: [
                    { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
                    { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
                    { internalType: 'uint256', name: 'amount0', type: 'uint256' },
                    { internalType: 'uint256', name: 'amount1', type: 'uint256' },
                ],
                stateMutability: 'payable',
                type: 'function',
            },
        ];

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 minutes

        const mintParams = {
            token0: token0 as `0x${string}`,
            token1: token1 as `0x${string}`,
            fee,
            tickLower,
            tickUpper,
            amount0Desired,
            amount1Desired,
            amount0Min: 0n,
            amount1Min: 0n,
            recipient: address as `0x${string}`,
            deadline,
        };

        const txHash = await writeContract(wagmiConfig, {
            abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
            address: NONFUNGIBLE_POSITION_MANAGER as `0x${string}`,
            functionName: 'mint',
            args: [mintParams],
            account: address,
        });
        const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: txHash });
        return receipt;
    };

    // Auto-convert handlers
    const formatDisplayAmount = _formatDisplayAmount;

    const handleAmount1Change = (value: string) => {
        console.log('🎯 handleAmount1Change called with:', value);
        setLastEdited('amount1');
        setAmount1(value);
    };

    const handleAmount2Change = (value: string) => {
        console.log('🎯 handleAmount2Change called with:', value);
        setLastEdited('amount2');
        setAmount2(value);
    };

    // Debounced conversion effect using market price for accurate conversions
    useEffect(() => {
        if (!marketPrice || marketPrice <= 0) {
            console.log('⏭️ Skipping conversion: no valid market price');
            return;
        }

        console.log('� Market price available:', marketPrice);

        let cancelled = false;
        const timer = setTimeout(() => {
            if (cancelled) return;

            try {
                if (lastEdited === 'amount1' && amount1 !== '') {
                    const n = Number(amount1);
                    console.log(`📝 Converting amount1:`, { amount1, n });
                    if (!isNaN(n) && isFinite(n) && n > 0) {
                        // amount1 is in tokenA (USDC), convert to tokenB (WBTC)
                        // marketPrice = WBTC per USDC
                        const converted = n * marketPrice;
                        // Format to avoid scientific notation
                        const formatted = converted.toLocaleString('en-US', { 
                            useGrouping: false, 
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 20
                        });
                        console.log(`💰 ${n} ${token1Symbol} × ${marketPrice} = ${converted} → formatted: ${formatted}`);
                        setAmount2(formatted);
                    }
                } else if (lastEdited === 'amount2' && amount2 !== '') {
                    const n = Number(amount2);
                    console.log(`📝 Converting amount2:`, { amount2, n });
                    if (!isNaN(n) && isFinite(n) && n > 0) {
                        // amount2 is in tokenB (WBTC), convert to tokenA (USDC)
                        // If marketPrice = WBTC per USDC, then USDC per WBTC = 1 / marketPrice
                        const converted = n / marketPrice;
                        // Format to avoid scientific notation
                        const formatted = converted.toLocaleString('en-US', { 
                            useGrouping: false, 
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 20
                        });
                        console.log(`💰 ${n} ${token2Symbol} ÷ ${marketPrice} = ${converted} → formatted: ${formatted}`);
                        setAmount1(formatted);
                    }
                } else {
                    console.log('⏭️ Skipping: invalid state', { lastEdited, amount1, amount2 });
                }
            } catch (e) {
                console.error('❌ Conversion error:', e);
            }
        }, 200);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [marketPrice, amount1, amount2, token1Symbol, token2Symbol, lastEdited]);

    const handleCreate = async () => {
        try {
            setPreflightError(null);
            if (!publicClient || !address) throw new Error('Wallet or client not connected');
            
            // Run preflight checks
            const ok = await runPreflightChecks();
            if (!ok) {
                setCreationStep('review');
                return;
            }

            setCreationStep('approving');
            
            // Approve tokens if needed
            const tokenAObj = mapBySymbol(token1Symbol);
            const tokenBObj = mapBySymbol(token2Symbol);
            if (!tokenAObj || !tokenBObj) throw new Error('Invalid token');
            
            const addrA = tokenAObj.address as `0x${string}`;
            const addrB = tokenBObj.address as `0x${string}`;
            const decA = tokenAObj.decimals ?? 18;
            const decB = tokenBObj.decimals ?? 18;
            
            const wantA = parseUnits(amount1 || '0', decA);
            const wantB = parseUnits(amount2 || '0', decB);
            
            // Large approval amount (10^18 of the token with full decimals)
            const maxApproval = parseUnits('100000000000000', decA); // Large amount
            
            // Check and approve token0 if needed
            const allowanceA = await publicClient.readContract({ 
                address: addrA, 
                abi: erc20Abi, 
                functionName: 'allowance', 
                args: [address as `0x${string}`, NONFUNGIBLE_POSITION_MANAGER as `0x${string}`] 
            });
            
            if (BigInt(allowanceA) < wantA) {
                console.log(`Approving ${tokenAObj.symbol}...`);
                try {
                    const approveTx = await writeContract(wagmiConfig, {
                        address: addrA,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [NONFUNGIBLE_POSITION_MANAGER as `0x${string}`, maxApproval],
                    });
                    console.log(`Waiting for ${tokenAObj.symbol} approval...`);
                    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
                    console.log(`✅ ${tokenAObj.symbol} approved`, receipt);
                } catch (approveErr) {
                    console.error(`Failed to approve ${tokenAObj.symbol}:`, approveErr);
                    throw approveErr;
                }
            } else {
                console.log(`${tokenAObj.symbol} already has sufficient allowance`);
            }
            
            // Check and approve token1 if needed
            const allowanceB = await publicClient.readContract({ 
                address: addrB, 
                abi: erc20Abi, 
                functionName: 'allowance', 
                args: [address as `0x${string}`, NONFUNGIBLE_POSITION_MANAGER as `0x${string}`] 
            });
            
            if (BigInt(allowanceB) < wantB) {
                console.log(`Approving ${tokenBObj.symbol}...`);
                try {
                    const approveTx = await writeContract(wagmiConfig, {
                        address: addrB,
                        abi: erc20Abi,
                        functionName: 'approve',
                        args: [NONFUNGIBLE_POSITION_MANAGER as `0x${string}`, maxApproval],
                    });
                    console.log(`Waiting for ${tokenBObj.symbol} approval...`);
                    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash: approveTx });
                    console.log(`✅ ${tokenBObj.symbol} approved`, receipt);
                } catch (approveErr) {
                    console.error(`Failed to approve ${tokenBObj.symbol}:`, approveErr);
                    throw approveErr;
                }
            } else {
                console.log(`${tokenBObj.symbol} already has sufficient allowance`);
            }

            setCreationStep('confirming');
            await createUniswapV3Position();
            setCreationStep('complete');
        } catch (e) {
            console.error('Transaction failed:', e);
            setPreflightError(String(e));
            setCreationStep('review');
        }
    }

    // Fetch token balances for the selected tokens
    useEffect(() => {
        let cancelled = false;
        const fetchBalances = async () => {
            if (!publicClient || !address) {
                setBalance1(null);
                setBalance2(null);
                return;
            }

            try {
                const t1 = mapBySymbol(token1Symbol);
                const t2 = mapBySymbol(token2Symbol);
                if (!t1 || !t2) {
                    console.warn('Token not found:', token1Symbol, token2Symbol);
                    setBalance1(null);
                    setBalance2(null);
                    return;
                }

                console.log('Fetching balances for:', t1.symbol, t2.symbol, 'from address:', address);

                const [raw1, raw2] = await Promise.all([
                    publicClient.readContract({ 
                        address: t1.address as `0x${string}`, 
                        abi: erc20Abi, 
                        functionName: 'balanceOf', 
                        args: [address as `0x${string}`] 
                    }).catch(err => {
                        console.error(`Failed to fetch ${t1.symbol} balance:`, err);
                        return BigInt(0);
                    }),
                    publicClient.readContract({ 
                        address: t2.address as `0x${string}`, 
                        abi: erc20Abi, 
                        functionName: 'balanceOf', 
                        args: [address as `0x${string}`] 
                    }).catch(err => {
                        console.error(`Failed to fetch ${t2.symbol} balance:`, err);
                        return BigInt(0);
                    }),
                ]);

                if (cancelled) return;

                console.log('Raw balances:', raw1, raw2);
                // publicClient.readContract for balanceOf returns a bigint-like value
                const bal1 = formatUnits(raw1 as bigint, t1.decimals);
                const bal2 = formatUnits(raw2 as bigint, t2.decimals);
                console.log('Formatted balances:', bal1, bal2);
                setBalance1(bal1);
                setBalance2(bal2);
            } catch (e) {
                console.error('Failed to fetch balances', e);
                setBalance1(null);
                setBalance2(null);
            }
        };

        fetchBalances();

        return () => { cancelled = true; };
    }, [publicClient, address, token1Symbol, token2Symbol]);

    const runPreflightChecks = async (): Promise<boolean> => {
        if (!address) {
            setPreflightError('Wallet not connected');
            return false;
        }

        if (!publicClient) {
            setPreflightError('RPC client not available');
            return false;
        }

        const tokenAObj = mapBySymbol(token1Symbol);
        const tokenBObj = mapBySymbol(token2Symbol);
        if (!tokenAObj || !tokenBObj) {
            setPreflightError('Unsupported token pair');
            return false;
        }
        const addrA = tokenAObj.address as `0x${string}`;
        const addrB = tokenBObj.address as `0x${string}`;

        // Check pool existence across common fee tiers
        try {
            const tokenA = (token1Symbol === 'USDC' ? USDC_TOKEN : (token1Symbol === 'WETH' ? WETH_TOKEN : token1Symbol === 'WBTC' ? WBTC_TOKEN : UNI_TOKEN));
            const tokenB = (token2Symbol === 'USDC' ? USDC_TOKEN : (token2Symbol === 'WETH' ? WETH_TOKEN : token2Symbol === 'WBTC' ? WBTC_TOKEN : UNI_TOKEN));
            const info = await findPoolForPair(publicClient, tokenA, tokenB, FEE_TIERS);
            if (!info) {
                setPreflightError(`Pool does not exist for selected tokens at fee tiers: ${FEE_TIERS.map(f => (f/10000).toFixed(2)+'%').join(', ')}`);
                return false;
            }
            // Store detected fee and pool address for the session
            setDetectedFee(info.fee);
            // If user already selected a fee, prefer that pool if available
            const preferred = availableFeePools.find(p => p.fee === (selectedFee ?? info.fee));
            if (preferred) {
                setPoolAddress(preferred.poolAddress);
                setDetectedFee(preferred.fee);
            } else {
                setPoolAddress(info.poolAddress);
            }
        } catch (e) {
            setPreflightError('Pool does not exist for selected tokens/fee');
            return false;
        }

        // Check balances
        try {
            const decA = tokenAObj.decimals ?? 18;
            const decB = tokenBObj.decimals ?? 18;

            const wantA = parseUnits(amount1 || '0', decA);
            const wantB = parseUnits(amount2 || '0', decB);

            // Read balances
            const balanceA = await publicClient.readContract({ address: addrA as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] });
            const balanceB = await publicClient.readContract({ address: addrB as `0x${string}`, abi: erc20Abi, functionName: 'balanceOf', args: [address as `0x${string}`] });

            if (BigInt(balanceA) < wantA) {
                setPreflightError('Insufficient balance for token0');
                return false;
            }
            if (BigInt(balanceB) < wantB) {
                setPreflightError('Insufficient balance for token1');
                return false;
            }

            // Ensure desired amounts are non-zero to avoid mint failures
            if (wantA === 0n || wantB === 0n) {
                setPreflightError('Both token amounts must be greater than zero');
                return false;
            }

            return true;
        } catch (e) {
            console.error('Preflight check failed', e);
            setPreflightError('Preflight error: ' + String(e));
            return false;
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
        let cancelled = false;

        const fetchPoolAddr = async () => {
            if (!publicClient) {
                setPoolAddress(null);
                return;
            }

            // Map to Uniswap Token constants
            const mapBySymbol = (sym: string) => {
                if (sym === 'USDC') return USDC_TOKEN;
                if (sym === 'WETH' || sym === 'ETH') return WETH_TOKEN;
                if (sym === 'WBTC') return WBTC_TOKEN;
                if (sym === 'UNI') return UNI_TOKEN;
                return null;
            };

            const tokenA = mapBySymbol(token1Symbol);
            const tokenB = mapBySymbol(token2Symbol);

            if (!tokenA || !tokenB) {
                setPoolAddress(null);
                return;
            }

            try {
                setIsFetchingPoolAddress(true);
                const info = await findPoolForPair(publicClient, tokenA, tokenB, FEE_TIERS);
                if (cancelled) return;
                if (info) {
                    const chosen = poolParam ?? info.poolAddress;
                    setPoolAddress(chosen);
                    setDetectedFee(info.fee);
                    setSelectedFee(info.fee);
                    // Try to find additional available fee pools
                    try {
                        const all = await findAllPoolsForPair(publicClient, tokenA, tokenB, FEE_TIERS);
                        setAvailableFeePools(all.map(a => ({ fee: a.fee, poolAddress: a.poolAddress })));
                    } catch (e) {
                        setAvailableFeePools([]);
                    }
                } else {
                    setPoolAddress(null);
                    setDetectedFee(null);
                    setAvailableFeePools([]);
                }
            } catch (e) {
                console.warn('Failed to fetch pool address for pair:', e);
                setPoolAddress(null);
                setDetectedFee(null);
            } finally {
                setIsFetchingPoolAddress(false);
            }
        };

        fetchPoolAddr();

        return () => { cancelled = true; };
    }, [token1Symbol, token2Symbol, publicClient]);

    useEffect(() => {
        if (!showReviewDialog) return;

        const runCalc = async () => {
            try {
                setIsCalculating(true);

                // Simply display the user-entered amounts
                // The actual position will be created on-chain during the mint transaction
                const pos = {
                    amount0: amount1 || '0',
                    amount1: amount2 || '0',
                    liquidity: '0',
                    tickLower: computedTickLower ?? -163920,
                    tickUpper: computedTickUpper ?? -161920,
                };

                console.log('📊 Position preview:', pos);
                setCalculatedPosition(pos);
            } catch (e) {
                console.error('Error preparing position:', e);
                setCalculatedPosition({ error: String(e) });
            } finally {
                setIsCalculating(false);
            }
        };

        runCalc();
    }, [showReviewDialog, amount1, amount2, computedTickLower, computedTickUpper]);

    // Compute ticks from min/max price when the pool/fee or price inputs change
    useEffect(() => {
        let cancelled = false;
        const compute = async () => {
            if (!publicClient) return;

            const mapBySymbol = (sym: string) => {
                if (sym === 'USDC') return USDC_TOKEN;
                if (sym === 'WETH' || sym === 'ETH') return WETH_TOKEN;
                if (sym === 'WBTC') return WBTC_TOKEN;
                if (sym === 'UNI') return UNI_TOKEN;
                return null;
            };

            const tokenA = mapBySymbol(token1Symbol);
            const tokenB = mapBySymbol(token2Symbol);
            if (!tokenA || !tokenB) {
                setComputedTickLower(null);
                setComputedTickUpper(null);
                return;
            }

            try {
                const fee = feeToUse;
                if (!fee || minPrice <= 0 || maxPrice === 'Infinity') {
                    setComputedTickLower(null);
                    setComputedTickUpper(null);
                    return;
                }

                const ticks = await computeTicksFromPrices(publicClient, tokenA, tokenB, fee, minPrice, Number(maxPrice));
                if (cancelled) return;
                setComputedTickLower(ticks.tickLower);
                setComputedTickUpper(ticks.tickUpper);
            } catch (e) {
                console.warn('Failed to compute ticks from prices:', e);
                setComputedTickLower(null);
                setComputedTickUpper(null);
            }
        };

        compute();
        return () => { cancelled = true; };
    }, [publicClient, token1Symbol, token2Symbol, feeToUse, minPrice, maxPrice]);

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
        setMarketPrice(null);
    }, [token1Symbol, token2Symbol, calculatedPosition]);

    // Proactively fetch market price when the token pair changes so the pair auto-converts before review
    useEffect(() => {
        let cancelled = false;

        const fetchPriceForPair = async () => {
            // Map to Uniswap Token constants
            const mapBySymbol = (sym: string) => {
                if (sym === 'USDC') return USDC_TOKEN;
                if (sym === 'WETH' || sym === 'ETH') return WETH_TOKEN;
                if (sym === 'WBTC') return WBTC_TOKEN;
                if (sym === 'UNI') return UNI_TOKEN;
                return null;
            };

            const tokenA = mapBySymbol(token1Symbol);
            const tokenB = mapBySymbol(token2Symbol);
            if (!tokenA || !tokenB) {
                setMarketPrice(null);
                return;
            }

            try {
                setIsFetchingMarketPrice(true);

                // Use a tiny amount to fetch pool state and price
                const chosenPool = poolParam ?? poolAddress;
                const poolAddrTyped = chosenPool ? (chosenPool as `0x${string}`) : undefined;
                const pos = await calculateLiquidityPosition({
                    token0: tokenA,
                    token1: tokenB,
                    fee: feeToUse,
                    amount0: '1',
                    amount1: '1',
                    poolAddress: poolAddrTyped,
                });

                if (cancelled) return;

                const parsed = Number(pos.currentPrice);
                if (!isNaN(parsed)) {
                    setMarketPrice(parsed);
                } else {
                    setMarketPrice(null);
                }
            } catch (e) {
                console.warn('Failed to fetch market price for pair:', e);
                setMarketPrice(null);
            } finally {
                setIsFetchingMarketPrice(false);
            }
        };

        fetchPriceForPair();

        return () => {
            cancelled = true;
        };
    }, [token1Symbol, token2Symbol]);

    // (conversion handled centrally by the conversion effect above)

    // Clear preflight error as soon as user changes inputs
    useEffect(() => {
        if (preflightError) setPreflightError(null);
    }, [amount1, amount2, token1Symbol, token2Symbol]);


    return (
        <>
            <main className="flex-1 p-4 md:p-6 lg:p-12 bg-gradient-to-b from-background to-muted/20">
                <div className="max-w-5xl mx-auto">
                    <div className="text-sm text-muted-foreground mb-6">
                        <Link href="/portfolio" className="hover:text-primary transition-colors">Your positions</Link> <span className="mx-2">→</span> <span className="text-foreground font-medium">New position</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-4xl font-bold mb-1">Create New Position</h1>
                            <p className="text-muted-foreground">Add liquidity to earn fees on Uniswap V3</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs">Reset</Button>
                            <Select defaultValue="v3">
                                <SelectTrigger className="w-[140px] h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="v2">v2 position</SelectItem>
                                    <SelectItem value="v3">v3 position</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Settings className="size-5" /></Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
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
                                        <Card className="bg-background/95 border-primary/10 shadow-lg">
                                            <CardContent className="p-8 space-y-8">
                                                <div>
                                                    <h3 className="font-bold text-lg mb-2">Select Token Pair</h3>
                                                    <p className="text-sm text-muted-foreground">Choose the tokens you want to provide liquidity for.</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <label className="text-sm font-medium mb-2 block">Token 1</label>
                                                        <TokenSelector tokens={tokens} value={token1Symbol} onChange={setToken1Symbol} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-sm font-medium mb-2 block">Token 2</label>
                                                        <TokenSelector tokens={tokens} value={token2Symbol} onChange={setToken2Symbol} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg mb-2">Fee Tier</h3>
                                                    <p className="text-sm text-muted-foreground mb-4">Select the fee tier. Higher fees suit lower volatility pairs.</p>
                                                    {isFetchingPoolAddress ? (
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin" /> Detecting pools...
                                                        </div>
                                                    ) : availableFeePools.length > 0 ? (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {availableFeePools.map(a => (
                                                                <Button 
                                                                    key={a.fee} 
                                                                    variant={a.fee === feeToUse ? 'default' : 'outline'} 
                                                                    onClick={() => { setSelectedFee(a.fee); setPoolAddress(a.poolAddress); setDetectedFee(a.fee); }}
                                                                    className="h-10 font-medium"
                                                                >
                                                                    {(a.fee/10000).toFixed(2)}%
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <Button size="lg" className="w-full h-12 text-base font-medium" onClick={() => setCurrentStep(2)} disabled={!poolAddress}>
                                                    Continue to Deposit
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {currentStep === 2 && (
                                        <div className="space-y-6">
                                            <Card className="bg-background/95 border-primary/10 shadow-lg">
                                                <CardContent className="p-6 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex -space-x-2">
                                                            <Image src={token1.icon.imageUrl} alt={token1.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                                                            <Image src={token2.icon.imageUrl} alt={token2.name} width={28} height={28} className="rounded-full border-2 border-background" data-ai-hint={token2.icon.imageHint}/>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-lg">{token1.symbol} / {token2.symbol}</p>
                                                            <p className="text-xs text-muted-foreground">Market price: {marketPrice ? `${marketPrice} ${token2.symbol} per ${token1.symbol}` : '—'}</p>
                                                            {isFetchingPoolAddress ? (
                                                                <p className="text-xs text-muted-foreground">Pool: fetching...</p>
                                                            ) : poolAddress ? (
                                                                <>
                                                                    <p className="text-xs text-muted-foreground">Pool: {poolAddress.slice(0, 6)}...{poolAddress.slice(-4)} • Fee: {feeToUse / 10000}%</p>
                                                                    {availableFeePools.length > 1 && (
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            {availableFeePools.map(a => (
                                                                                <Button key={a.fee} variant={a.fee === feeToUse ? 'secondary' : 'ghost'} size="sm" onClick={() => { setSelectedFee(a.fee); setPoolAddress(a.poolAddress); setDetectedFee(a.fee); }}>{(a.fee/10000).toFixed(2)}%</Button>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">Pool: —</p>
                                                            )}
                                                        </div>
                                                        <Badge variant="secondary">v3</Badge>
                                                        <Badge variant="secondary">{(feeToUse/10000).toFixed(2)}%</Badge>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}><Edit className="mr-2 h-4 w-4"/> Edit</Button>
                                                </CardContent>
                                            </Card>
                                            {/* <Card className="bg-card/50">
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
                                            </Card> */}
                                            <Card className="bg-background/95 border-primary/10 shadow-lg">
                                                <CardHeader>
                                                    <CardTitle className="text-lg font-bold">Deposit Tokens</CardTitle>
                                                    <CardDescription>Enter the amounts for your liquidity contribution.</CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-6">
                                                    <AmountInput token={token1} value={amount1} onChange={handleAmount1Change} onFocus={() => setLastEdited('amount1')} marketPrice={marketPrice} otherSymbol={token2.symbol} isBase={true} balance={balance1} />
                                                    <AmountInput token={token2} value={amount2} onChange={handleAmount2Change} onFocus={() => setLastEdited('amount2')} marketPrice={marketPrice} otherSymbol={token1.symbol} isBase={false} balance={balance2} />

                                                    <Button size="lg" className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80" disabled={!amount1 || !amount2} onClick={() => setShowReviewDialog(true)}>
                                                        {!amount1 || !amount2 ? "Enter amounts for both tokens" : "Review & Continue"}
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
                <DialogContent className="max-w-md">
                    <div className="flex items-center justify-between mb-6">
                        <DialogTitle className="text-xl font-bold">Creating position</DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="text-xs">Get help</Button>
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-4 w-4" /></Button>
                            </DialogClose>
                        </div>
                    </div>

                    {creationStep === 'review' && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <Image src={token1.icon.imageUrl} alt={token1.name} width={32} height={32} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                                    <Image src={token2.icon.imageUrl} alt={token2.name} width={32} height={32} className="rounded-full border-2 border-background" data-ai-hint={token2.icon.imageHint}/>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold">{token1.symbol} / {token2.symbol}</h2>
                                </div>
                                <div className="flex gap-2">
                                    <Badge className="bg-primary/10 text-primary border-0">v3</Badge>
                                    <Badge className="bg-primary/10 text-primary border-0">{(feeToUse / 10000).toFixed(2)}%</Badge>
                                </div>
                            </div>
                            
                            {/* <div className="h-20 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center text-muted-foreground border border-primary/10">
                                <AreaChart className="w-40 h-16 text-primary/30" />
                            </div> */}

                            <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/10">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2 font-medium">Min Price</p>
                                    <p className="font-bold text-sm text-foreground">{minPrice}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2 font-medium">Max Price</p>
                                    <p className="font-bold text-sm text-foreground">{maxPrice === 'Infinity' ? '∞' : maxPrice}</p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-background to-muted/30 rounded-lg p-4 space-y-4 border border-primary/5">
                                <h3 className="text-sm font-bold text-foreground">Depositing</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-primary/10 hover:border-primary/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Image src={token1.icon.imageUrl} alt={token1.name} width={28} height={28} className="rounded-full ring-2 ring-background" data-ai-hint={token1.icon.imageHint}/>
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{amount1}</p>
                                                <p className="text-xs text-muted-foreground">{token1.symbol}</p>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground">
                                            {marketPrice ? `≈ ${(Number(amount1) * marketPrice).toFixed(8)} ${token2.symbol}` : '—'}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-primary/10 hover:border-primary/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Image src={token2.icon.imageUrl} alt={token2.name} width={28} height={28} className="rounded-full ring-2 ring-background" data-ai-hint={token2.icon.imageHint}/>
                                            <div>
                                                <p className="font-bold text-sm text-foreground">{amount2}</p>
                                                <p className="text-xs text-muted-foreground">{token2.symbol}</p>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-muted-foreground">
                                            {marketPrice ? `≈ ${(Number(amount2) / marketPrice).toFixed(8)} ${token1.symbol}` : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-background to-muted/30 rounded-lg p-4 space-y-3 border border-primary/5">
                                <h4 className="text-sm font-bold text-foreground">Estimated Position</h4>
                                {isCalculating ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                        <Loader2 className="h-4 w-4 animate-spin" /> Calculating...
                                    </div>
                                ) : calculatedPosition ? (
                                    calculatedPosition.error ? (
                                        <p className="text-sm text-destructive py-2">{calculatedPosition.error}</p>
                                    ) : (
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Amount {token1.symbol}</span>
                                                <span className="font-medium">{calculatedPosition.amount0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Amount {token2.symbol}</span>
                                                <span className="font-medium">{calculatedPosition.amount1}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Liquidity</span>
                                                <span className="font-medium">{calculatedPosition.liquidity}</span>
                                            </div>
                                            <div className="flex justify-between pt-2 border-t border-border/30">
                                                <span className="text-muted-foreground text-xs">Tick range</span>
                                                <span className="font-medium text-xs">{calculatedPosition.tickLower} → {calculatedPosition.tickUpper}</span>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-sm text-muted-foreground py-2">—</p>
                                )}
                            </div>

                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/10">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Network Cost</p>
                                    <p className="font-bold text-foreground">$2.14</p>
                                </div>
                                {preflightError && (
                                    <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-3 mt-2">{preflightError}</div>
                                )}
                            </div>

                            <Button size="lg" className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80" onClick={handleCreate} disabled={isCalculating || isFetchingMarketPrice || !!preflightError}>
                                {preflightError ? 'Fix Error to Create' : 'Create Position'}
                            </Button>
                        </div>
                    )}                    {creationStep !== 'review' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex -space-x-2">
                                    <Image src={token1.icon.imageUrl} alt={token1.name} width={32} height={32} className="rounded-full border-2 border-background" data-ai-hint={token1.icon.imageHint}/>
                                    <Image src={token2.icon.imageUrl} alt={token2.name} width={32} height={32} className="rounded-full border-2 border-background" data-ai-hint={token2.icon.imageHint}/>
                                </div>
                                <h2 className="text-2xl font-bold">{token1.symbol} / {token2.symbol}</h2>
                            </div>
                            
                            {/* <div className="h-20 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center border border-primary/10">
                                <AreaChart className="w-40 h-16 text-primary/30" />
                            </div> */}

                            <div className="space-y-3">
                                <div className={cn("flex items-start gap-3 p-4 rounded-lg transition-all", creationStep === 'approving' || creationStep === 'confirming' || creationStep === 'complete' ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20' : 'bg-secondary/30 border border-transparent')}>
                                    {creationStep === 'approving' ? (
                                        <Loader2 className="size-5 text-primary animate-spin mt-0.5 flex-shrink-0" />
                                    ) : creationStep === 'confirming' || creationStep === 'complete' ? (
                                        <CheckCircle className="size-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <Circle className="size-5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm">Approve Tokens</p>
                                        <p className="text-xs text-muted-foreground mt-1">Allow the contract to spend your tokens</p>
                                        <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors mt-2 inline-block">Why do I need to approve?</a>
                                    </div>
                                </div>

                                <div className={cn("flex items-start gap-3 p-4 rounded-lg transition-all", creationStep === 'confirming' || creationStep === 'complete' ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20' : 'bg-secondary/30 border border-transparent', creationStep === 'approving' && "opacity-50")}>
                                    {creationStep === 'confirming' ? (
                                        <Loader2 className="size-5 text-primary animate-spin mt-0.5 flex-shrink-0" />
                                    ) : creationStep === 'complete' ? (
                                        <CheckCircle className="size-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <Circle className="size-5 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm">Confirm Transaction</p>
                                        <p className="text-xs text-muted-foreground mt-1">Create your liquidity position on Uniswap V3</p>
                                    </div>
                                </div>
                            </div>

                            {creationStep === 'complete' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center p-4 bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg">
                                        <CheckCircle className="size-6 text-green-500 mr-3" />
                                        <span className="font-bold text-green-600">Position Created Successfully!</span>
                                    </div>
                                    <Button size="lg" className="w-full h-12 text-base font-medium bg-gradient-to-r from-green-600 to-green-600/90 hover:from-green-600/90 hover:to-green-600/80 text-white" onClick={handleDone}>View Position</Button>
                                </div>
                            )}
                         </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

    
