import React, { createContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { sdk } from '@farcaster/miniapp-sdk';

const FarcasterSolanaProvider = dynamic(
  () => import('@farcaster/mini-app-solana').then(mod => mod.FarcasterSolanaProvider),
  { ssr: false }
);

type SafeFarcasterSolanaProviderProps = {
  endpoint: string;
  children: React.ReactNode;
};

const SolanaProviderContext = createContext<{ hasSolanaProvider: boolean }>({ hasSolanaProvider: false });

export function SafeFarcasterSolanaProvider({ endpoint, children }: SafeFarcasterSolanaProviderProps) {
  const isClient = typeof window !== "undefined";
  const [hasSolanaProvider, setHasSolanaProvider] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);
  
  // Ensure effects are defined consistently and don't depend on conditional logic
  useEffect(() => {
    if (!isClient) return;
    
    let cancelled = false;
    (async () => {
      try {
        const provider = await sdk.wallet.getSolanaProvider();
        if (!cancelled) {
          setHasSolanaProvider(!!provider);
        }
      } catch {
        if (!cancelled) {
          setHasSolanaProvider(false);
        }
      } finally {
        if (!cancelled) {
          setChecked(true);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [isClient]);

  // Keep this effect separate and unconditional
  useEffect(() => {
    let errorShown = false;
    const origError = console.error;
    
    console.error = (...args) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("WalletConnectionError: could not get Solana provider")
      ) {
        if (!errorShown) {
          origError(...args);
          errorShown = true;
        }
        return;
      }
      origError(...args);
    };
    
    return () => {
      console.error = origError;
    };
  }, []);

  // Use a rendering variable instead of early returns that might affect hook order
  const shouldRender = isClient && checked;

  if (!shouldRender) {
    return null;
  }

  return (
    <SolanaProviderContext.Provider value={{ hasSolanaProvider }}>
      {hasSolanaProvider ? (
        <FarcasterSolanaProvider endpoint={endpoint}>
          {children}
        </FarcasterSolanaProvider>
      ) : (
        <>{children}</>
      )}
    </SolanaProviderContext.Provider>
  );
}

export function useHasSolanaProvider() {
  const context = React.useContext(SolanaProviderContext);
  if (context === undefined) {
    throw new Error('useHasSolanaProvider must be used within a SafeFarcasterSolanaProvider');
  }
  return context.hasSolanaProvider;
}
