/**
 * React hook for accessing Hiero account data
 */

import { useQuery } from '@tanstack/react-query';

import { useChronos } from '../providers/ChronosProvider';
import { HieroAccountState } from '../types';

/**
 * Hook to fetch and track Hiero account balance
 * 
 * @param accountId - The account ID to track
 * @param options - Query options
 * @returns Account state including balance and loading status
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { balance, isLoading, error } = useHieroAccount('0.0.12345');
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return <div>Balance: {balance} tinybars</div>;
 * }
 * ```
 */
export function useHieroAccount(
  accountId: string,
  options?: {
    refreshInterval?: number;
    enabled?: boolean;
  }
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
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refreshInterval,
  });

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    accountId,
    balance: data ?? null,
    isLoading,
    error: error,
    refetch,
  };
}
