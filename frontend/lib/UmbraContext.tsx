

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { umbraClient } from './umbra';
import { useCurrentAccount } from '@mysten/dapp-kit';

interface UmbraState {
  commitmentCount: bigint;
  merkleRoot: bigint;
  poolBalance: bigint;
  totalDeposited: bigint;
}

interface UmbraContextValue {
  state: UmbraState | null;
  balance: bigint | null;
  isLoading: boolean;
  refreshState: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const UmbraContext = createContext<UmbraContextValue | undefined>(undefined);

export const UmbraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const currentAccount = useCurrentAccount();
  const [state, setState] = useState<UmbraState | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshState = async () => {
    try {
      setIsLoading(true);
      const protocolState = await umbraClient.getState();
      setState(protocolState);
    } catch (error) {
      console.error('Failed to fetch Umbra state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!currentAccount?.address) {
      setBalance(null);
      return;
    }

    try {
      const userBalance = await umbraClient.getBalance(currentAccount.address);
      setBalance(userBalance);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [currentAccount?.address]);

  return (
    <UmbraContext.Provider
      value={{
        state,
        balance,
        isLoading,
        refreshState,
        refreshBalance,
      }}
    >
      {children}
    </UmbraContext.Provider>
  );
};

export const useUmbra = () => {
  const context = useContext(UmbraContext);
  if (!context) {
    throw new Error('useUmbra must be used within UmbraProvider');
  }
  return context;
};

