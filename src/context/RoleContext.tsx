"use client";
import ABIS, { CONTRACT_ADDRESSES } from "@/constants/abis";
import { useAccount } from "wagmi";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);




export function RoleProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { isRegistered, isLoading } = useIsRegisteredLeader(address);
  const [role, setRole] = useState<Role>('follower');

  useEffect(() => {
    if (!isLoading) {
      setRole(isRegistered ? 'leader' : 'follower');
    }
  }, [isRegistered, isLoading]);

  return (
    <RoleContext.Provider value={{ role }}>
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
