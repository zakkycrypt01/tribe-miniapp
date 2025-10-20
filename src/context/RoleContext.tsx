"use client";
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { config as wagmiConfig } from "@/components/providers/WagmiProvider";

import { createContext, useContext, useState, ReactNode } from 'react';

import { useReadContract } from "wagmi";

type Role = 'follower' | 'leader';

// Custom hook to check if an address is a registered leader
export function useIsRegisteredLeader(address?: `0x${string}` | undefined) {
  const { data, isLoading, isError } = useReadContract({
    address: CONTRACT_ADDRESSES.LEADER_REGISTRY as `0x${string}`,
    abi: ABIS.TribeLeaderRegistry,
    functionName: "isRegisteredLeader",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
  return {
    isRegistered: Boolean(data),
    isLoading,
    isError,
  };
}

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('follower');

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
