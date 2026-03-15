'use client';

import { MirrorNodeClient } from '@/lib/client';
import type { HieroNetworkConfig } from '@/lib/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

interface ChronosContextValue {
  config: HieroNetworkConfig;
  mirrorNodeClient: MirrorNodeClient;
}

const ChronosContext = createContext<ChronosContextValue | null>(null);

export function useChronos(): ChronosContextValue {
  const context = useContext(ChronosContext);
  if (!context) {
    throw new Error('useChronos must be used within ChronosProvider');
  }
  return context;
}

interface ChronosProviderProps {
  config: HieroNetworkConfig;
  children: ReactNode;
}

export function ChronosProvider({ config, children }: ChronosProviderProps) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 3,
            staleTime: 30_000,
          },
        },
      }),
    []
  );

  const mirrorNodeClient = useMemo(
    () => new MirrorNodeClient({ baseUrl: config.mirrorNodeUrl }),
    [config.mirrorNodeUrl]
  );

  const contextValue = useMemo(
    () => ({ config, mirrorNodeClient }),
    [config, mirrorNodeClient]
  );

  return (
    <ChronosContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ChronosContext.Provider>
  );
}
