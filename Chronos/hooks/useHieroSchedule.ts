'use client';

import { useChronos } from '@/components/providers/ChronosProvider';
import { BatchCompiler } from '@/lib/batch';
import { PreFlightError } from '@/lib/errors';
import { PreFlightEngine, type PreFlightPlan } from '@/lib/preflight';
import { ScheduleManager } from '@/lib/schedule';
import { PrivateKey, type Transaction, type TransactionReceipt } from '@hashgraph/sdk';
import { useMutation } from '@tanstack/react-query';

interface UseHieroScheduleReturn {
  scheduleFor: (
    transactions: Transaction[],
    plan: PreFlightPlan,
    executeAt: Date,
    memo?: string
  ) => Promise<TransactionReceipt>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  receipt: TransactionReceipt | null;
}

function getOperatorKey(): PrivateKey {
  const operatorKey = process.env.NEXT_PUBLIC_OPERATOR_KEY;
  if (!operatorKey) {
    throw new Error('OPERATOR_KEY is required');
  }

  try {
    return PrivateKey.fromStringECDSA(operatorKey);
  } catch {
    try {
      return PrivateKey.fromStringED25519(operatorKey);
    } catch {
      throw new Error('OPERATOR_KEY is invalid');
    }
  }
}

export function useHieroSchedule(): UseHieroScheduleReturn {
  const { client, mirrorNodeClient } = useChronos();

  const mutation = useMutation<
    TransactionReceipt,
    Error,
    { transactions: Transaction[]; plan: PreFlightPlan; executeAt: Date; memo?: string }
  >({
    mutationFn: async ({ transactions, plan, executeAt, memo }) => {
      if (!client) {
        throw new Error('Hiero client is not ready. Initialize useHieroAccount() first.');
      }

      const preflightResult = await new PreFlightEngine(mirrorNodeClient).run(plan);
      if (!preflightResult.passed) {
        throw new PreFlightError('Pre-flight checks failed', preflightResult.failures);
      }

      const compiler = new BatchCompiler();
      for (const transaction of transactions) {
        compiler.add(transaction);
      }

      const batches = compiler.compile();
      if (batches.length !== 1) {
        throw new Error(
          `Expected exactly 1 batch for scheduling, but got ${batches.length}. Reduce transaction size/count.`
        );
      }

      const scheduleManager = new ScheduleManager();
      const scheduledTransaction = scheduleManager.wrap(batches[0], executeAt, memo);
      const signedSchedule = await scheduledTransaction.sign(getOperatorKey());
      const response = await signedSchedule.execute(client);
      const receipt = await response.getReceipt(client);

      return receipt;
    },
  });

  return {
    scheduleFor: (transactions, plan, executeAt, memo) =>
      mutation.mutateAsync({ transactions, plan, executeAt, memo }),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    receipt: mutation.data ?? null,
  };
}
