/**
 * React hook for creating scheduled transactions
 */

import { ScheduleManager, ScheduleTransactionConfig } from '@chronos-kit/core';
import { Transaction, ScheduleCreateTransaction, PrivateKey } from '@hashgraph/sdk';
import { useState, useCallback } from 'react';

interface UseHieroScheduleOptions {
  config: ScheduleTransactionConfig;
}

interface UseHieroScheduleReturn {
  /** Create a scheduled transaction */
  createSchedule: (
    transaction: Transaction,
    memo?: string
  ) => Promise<ScheduleCreateTransaction>;
  /** Sign a scheduled transaction */
  signSchedule: (
    scheduleTransaction: ScheduleCreateTransaction,
    signingKey: PrivateKey
  ) => Promise<ScheduleCreateTransaction>;
  /** Loading state */
  isCreating: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook for creating HIP-423 scheduled transactions
 * 
 * @param options - Schedule configuration options
 * @returns Schedule creation utilities
 * 
 * @example
 * ```tsx
 * function ScheduledPayment() {
 *   const { createSchedule, signSchedule, isCreating } = useHieroSchedule({
 *     config: {
 *       payerAccountId: '0.0.12345',
 *       expirationTime: new Date('2024-12-31'),
 *     }
 *   });
 *   
 *   const handleSchedule = async () => {
 *     const schedule = await createSchedule(transaction, 'Monthly payment');
 *     const signed = await signSchedule(schedule, myKey);
 *     // Submit signed schedule...
 *   };
 *   
 *   return <button onClick={handleSchedule}>Schedule Transaction</button>;
 * }
 * ```
 */
export function useHieroSchedule(options: UseHieroScheduleOptions): UseHieroScheduleReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const manager = new ScheduleManager(options.config);

  const createSchedule = useCallback(
    async (transaction: Transaction, memo?: string) => {
      setIsCreating(true);
      setError(null);

      try {
        const schedule = manager.createSchedule(transaction, memo);
        return schedule;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsCreating(false);
      }
    },
    [manager]
  );

  const signSchedule = useCallback(
    async (scheduleTransaction: ScheduleCreateTransaction, signingKey: PrivateKey) => {
      try {
        return await manager.signSchedule(scheduleTransaction, signingKey);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      }
    },
    [manager]
  );

  return {
    createSchedule,
    signSchedule,
    isCreating,
    error,
  };
}
