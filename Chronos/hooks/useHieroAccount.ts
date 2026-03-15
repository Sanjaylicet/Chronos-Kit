'use client';

import { useQuery } from '@tanstack/react-query';
import { useChronos } from '@/components/providers/ChronosProvider';

export interface HieroAccountState {
  accountId: string;
  balance: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHieroAccount(
  accountId: string,
  options?: { refreshInterval?: number; enabled?: boolean }
): HieroAccountState {
  const { mirrorNodeClient } = useChronos();

  const {
    data,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['hiero-account', accountId],
    queryFn: async () => {
      const accountBalance = await mirrorNodeClient.getAccountBalance(accountId);
      return accountBalance.balance;
    },
    enabled: (options?.enabled ?? true) && accountId.length > 0,
    refetchInterval: options?.refreshInterval,
  });

  return {
    accountId,
    balance: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch: async () => {
      await queryRefetch();
    },
  };
}
