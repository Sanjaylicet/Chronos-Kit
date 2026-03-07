/**
 * Hiero Account Context Provider
 */

import { createContext, useContext, useMemo } from 'react';

import { HieroAccountProviderProps } from '../types';

interface HieroAccountContextValue {
  accountId: string;
  refreshInterval?: number;
}

const HieroAccountContext = createContext<HieroAccountContextValue | null>(null);

/**
 * Hook to access HieroAccount context
 */
export function useHieroAccountContext(): HieroAccountContextValue {
  const context = useContext(HieroAccountContext);
  if (!context) {
    throw new Error('useHieroAccountContext must be used within HieroAccountProvider');
  }
  return context;
}

/**
 * Provider for tracking a specific Hiero account
 */
export function HieroAccountProvider({
  accountId,
  children,
  refreshInterval,
}: HieroAccountProviderProps) {
  const contextValue = useMemo(
    () => ({
      accountId,
      refreshInterval,
    }),
    [accountId, refreshInterval]
  );

  return (
    <HieroAccountContext.Provider value={contextValue}>
      {children}
    </HieroAccountContext.Provider>
  );
}
