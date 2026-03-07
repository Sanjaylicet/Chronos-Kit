/**
 * Main Chronos Context Provider
 */

import { MirrorNodeClient, HieroNetworkConfig } from '@chronos-kit/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

import { ChronosProviderProps } from '../types';

interface ChronosContextValue {
  config: HieroNetworkConfig;
  mirrorNodeClient: MirrorNodeClient;
}

const ChronosContext = createContext<ChronosContextValue | null>(null);

/**
 * Hook to access Chronos context
 */
export function useChronos(): ChronosContextValue {
  const context = useContext(ChronosContext);
  if (!context) {
    throw new Error('useChronos must be used within ChronosProvider');
  }
  return context;
}

/**
 * Root provider for Chronos-Kit
 * Wraps the application with necessary context and TanStack Query
 */
export function ChronosProvider({ config, children }: ChronosProviderProps) {
  // Create QueryClient instance
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 3,
            staleTime: 30000, // 30 seconds
          },
        },
      }),
    []
  );

  // Create Mirror Node client
  const mirrorNodeClient = useMemo(
    () =>
      new MirrorNodeClient({
        baseUrl: config.mirrorNodeUrl,
      }),
    [config.mirrorNodeUrl]
  );

  const contextValue = useMemo(
    () => ({
      config,
      mirrorNodeClient,
    }),
    [config, mirrorNodeClient]
  );

  return (
    <ChronosContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ChronosContext.Provider>
  );
}
