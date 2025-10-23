import { useState } from 'react';
import { useWriteContract, useReadContract, useAccount, useBalance } from 'wagmi';
import { formatEther, parseUnits, parseEther } from 'viem';
import { readContract } from '@wagmi/core';
import { config } from '../components/providers/WagmiProvider';
import ABIS, { CONTRACT_ADDRESSES } from '../constants/abis';

// Contract addresses from your constants
const USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const WETH = '0x4200000000000000000000000000000000000006';

interface UseDepositParams {
  leaderAddress: `0x${string}`;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface TokenDepositAmount {
  token: `0x${string}`;
  amount: bigint;
  decimals: number;
}

interface VaultState {
  depositedCapital: bigint;
  highWaterMark: bigint;
  activePositions: number;
  positions: Array<{
    protocol: string;
    token0: string;
    token1: string;
    liquidity: bigint;
    tokenId: bigint;
    isActive: boolean;
  }>;
}

// ERC20 ABI for token interactions
const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

export function useDeposit({ leaderAddress, onSuccess, onError }: UseDepositParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Get token balances
  const { data: usdcBalance } = useBalance({
    address: userAddress,
    token: USDC as `0x${string}`
  });

  const { data: wethBalance } = useBalance({
    address: userAddress,
    token: WETH as `0x${string}`
  });

  const getVaultState = async (vaultAddress: `0x${string}`) => {
    try {
      const [capital, hwm, activePositionCount] = await Promise.all([
        readContract(config, {
          address: vaultAddress,
          abi: ABIS.TribeCopyVault,
          functionName: "depositedCapital",
        }),
        readContract(config, {
          address: vaultAddress,
          abi: ABIS.TribeCopyVault,
          functionName: "highWaterMark",
        }),
        readContract(config, {
          address: vaultAddress,
          abi: ABIS.TribeCopyVault,
          functionName: "getActivePositionCount",
        })
      ]);

      let positions = [];
      if (Number(activePositionCount) > 0) {
        const positionsResult = await readContract(config, {
          address: vaultAddress,
          abi: ABIS.TribeCopyVault,
          functionName: "getAllPositions",
        });
        positions = Array.isArray(positionsResult) ? positionsResult : [];
      }

      setVaultState({
        depositedCapital: capital as bigint,
        highWaterMark: hwm as bigint,
        activePositions: Number(activePositionCount),
        positions: positions
      });
    } catch (error) {
      console.error('Error fetching vault state:', error);
    }
  };

  const depositMultipleTokens = async (deposits: TokenDepositAmount[]) => {
    if (!userAddress) throw new Error('No user address available');
    setIsLoading(true);
    setCurrentStep('');
    setTxHash('');

    try {
      // Step 1: Get or create vault
      setCurrentStep('Checking for existing vault...');
      let vaultAddress: string;

      try {
        const result = await readContract(config, {
          address: CONTRACT_ADDRESSES.VAULT_FACTORY as `0x${string}`,
          abi: ABIS.TribeVaultFactory,
          functionName: "getVault",
          args: [userAddress,leaderAddress]
        });

        vaultAddress = result as string;
      } catch (error) {
        console.error('Error checking vault:', error);
        vaultAddress = "0x0000000000000000000000000000000000000000";
      }

      // Create new vault if none exists
      if (vaultAddress === "0x0000000000000000000000000000000000000000") {
        setCurrentStep('Creating new vault...');
        const createTx = await writeContractAsync({
          address: CONTRACT_ADDRESSES.VAULT_FACTORY as `0x${string}`,
          abi: ABIS.TribeVaultFactory,
          functionName: "createVault",
          args: [leaderAddress]
        });

        setTxHash(createTx);
        setCurrentStep('Waiting for vault creation...');
        
        const newVaultResult = await readContract(config, {
          address: CONTRACT_ADDRESSES.VAULT_FACTORY as `0x${string}`,
          abi: ABIS.TribeVaultFactory,
          functionName: "getVault",
          args: [userAddress,leaderAddress]
        });

        vaultAddress = newVaultResult as string;
        
        if (vaultAddress === "0x0000000000000000000000000000000000000000") {
          throw new Error('Failed to create vault');
        }
      }

      // Step 2: Process each token deposit
      for (const deposit of deposits) {
        const { token, amount, decimals } = deposit;

        // Check balance
        const balance = await readContract(config, {
          address: token,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress]
        });

        if (balance < amount) {
          throw new Error(`Insufficient balance for token ${token}`);
        }

        // Approve token
        setCurrentStep(`Approving token ${token}...`);
        const approveTx = await writeContractAsync({
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [vaultAddress as `0x${string}`, amount]
        });

        setTxHash(approveTx);
        setCurrentStep('Waiting for approval...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Deposit token
        setCurrentStep(`Depositing token ${token}...`);
        const depositTx = await writeContractAsync({
          address: vaultAddress as `0x${string}`,
          abi: ABIS.TribeCopyVault,
          functionName: "deposit",
          args: [token, amount]
        });

        setTxHash(depositTx);
        setCurrentStep(`Completing deposit for ${token}...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Update vault state after deposits
      await getVaultState(vaultAddress as `0x${string}`);
      
      setCurrentStep('All deposits completed');
      onSuccess?.();

    } catch (error) {
      console.error('Deposit error:', error);
      onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Convenience method for depositing both USDC and WETH with predefined amounts
  const depositDefaultAmounts = async () => {
    const deposits: TokenDepositAmount[] = [];
    
    // Add USDC deposit (2 units)
    if (usdcBalance && BigInt(usdcBalance.value) >= 2n) {
      deposits.push({
        token: USDC as `0x${string}`,
        amount: 2n,
        decimals: 6
      });
    }

    // Add WETH deposit (0.00005 WETH)
    const wethAmount = parseEther('0.00005');
    if (wethBalance && BigInt(wethBalance.value) >= wethAmount) {
      deposits.push({
        token: WETH as `0x${string}`,
        amount: wethAmount,
        decimals: 18
      });
    }

    if (deposits.length > 0) {
      await depositMultipleTokens(deposits);
    } else {
      throw new Error('Insufficient balance for any deposits');
    }
  };

  return {
    depositMultipleTokens,
    depositDefaultAmounts,
    isLoading,
    currentStep,
    txHash,
    vaultState,
    usdcBalance,
    wethBalance
  };
}
