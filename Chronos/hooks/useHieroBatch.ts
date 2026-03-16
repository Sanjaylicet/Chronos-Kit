'use client';

import { useChronos } from '@/components/providers/ChronosProvider';
import { BatchCompiler } from '@/lib/batch';
import { PreFlightError } from '@/lib/errors';
import { PreFlightEngine, type PreFlightPlan } from '@/lib/preflight';
import { PrivateKey, type Transaction, type TransactionReceipt } from '@hashgraph/sdk';
import { useMutation } from '@tanstack/react-query';

interface UseHieroBatchResult {
  submitBatch: (transactions: Transaction[], plan: PreFlightPlan) => Promise<TransactionReceipt[]>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  receipts: TransactionReceipt[] | null;
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

export function useHieroBatch(): UseHieroBatchResult {
  const { client, mirrorNodeClient } = useChronos();

  const mutation = useMutation<TransactionReceipt[], Error, { transactions: Transaction[]; plan: PreFlightPlan }>({
    mutationFn: async ({ transactions, plan }) => {
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
      const operatorKey = getOperatorKey();
      const receipts: TransactionReceipt[] = [];

      for (const batch of batches) {
        const signedBatch = await batch.sign(operatorKey);
        const response = await signedBatch.execute(client);
        const receipt = await response.getReceipt(client);
        receipts.push(receipt);
      }

      return receipts;
    },
  });

  return {
    submitBatch: (transactions, plan) => mutation.mutateAsync({ transactions, plan }),
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    receipts: mutation.data ?? null,
  };
}
