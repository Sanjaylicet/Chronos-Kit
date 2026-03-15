'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface HieroAccountContextValue {
  accountId: string;
  refreshInterval?: number;
}

const HieroAccountContext = createContext<HieroAccountContextValue | null>(null);

export function useHieroAccountContext(): HieroAccountContextValue {
  const context = useContext(HieroAccountContext);
  if (!context) {
    throw new Error('useHieroAccountContext must be used within HieroAccountProvider');
  }
  return context;
}

interface HieroAccountProviderProps {
  accountId: string;
  children: ReactNode;
  refreshInterval?: number;
}

export function HieroAccountProvider({
  accountId,
  children,
  refreshInterval,
}: HieroAccountProviderProps) {
  const contextValue = useMemo(
    () => ({ accountId, refreshInterval }),
    [accountId, refreshInterval]
  );

  return (
    <HieroAccountContext.Provider value={contextValue}>
      {children}
    </HieroAccountContext.Provider>
  );
}
