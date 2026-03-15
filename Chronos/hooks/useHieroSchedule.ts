'use client';

import { ScheduleManager } from '@/lib/schedule';
import type { ScheduleTransactionConfig } from '@/lib/types';
import type { Transaction, ScheduleCreateTransaction, PrivateKey } from '@hashgraph/sdk';
import { useState, useCallback } from 'react';

interface UseHieroScheduleOptions {
  config: ScheduleTransactionConfig;
}

interface UseHieroScheduleReturn {
  createSchedule: (
    transaction: Transaction,
    memo?: string
  ) => Promise<ScheduleCreateTransaction>;
  signSchedule: (
    scheduleTransaction: ScheduleCreateTransaction,
    signingKey: PrivateKey
  ) => Promise<ScheduleCreateTransaction>;
  isCreating: boolean;
  error: Error | null;
}

export function useHieroSchedule(options: UseHieroScheduleOptions): UseHieroScheduleReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSchedule = useCallback(
    async (transaction: Transaction, memo?: string) => {
      setIsCreating(true);
      setError(null);

      try {
        const manager = new ScheduleManager(options.config);
        return manager.createSchedule(transaction, memo);
      } catch (err) {
        const caught = err instanceof Error ? err : new Error('Unknown error');
        setError(caught);
        throw caught;
      } finally {
        setIsCreating(false);
      }
    },
    [options.config]
  );

  const signSchedule = useCallback(
    async (scheduleTransaction: ScheduleCreateTransaction, signingKey: PrivateKey) => {
      try {
        const manager = new ScheduleManager(options.config);
        return await manager.signSchedule(scheduleTransaction, signingKey);
      } catch (err) {
        const caught = err instanceof Error ? err : new Error('Unknown error');
        setError(caught);
        throw caught;
      }
    },
    [options.config]
  );

  return { createSchedule, signSchedule, isCreating, error };
}
