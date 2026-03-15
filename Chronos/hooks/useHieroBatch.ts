'use client';

import { BatchCompiler } from '@/lib/batch';
import type { BatchTransactionConfig, BatchCompilationResult } from '@/lib/types';
import type { Transaction, AccountId } from '@hashgraph/sdk';
import { useState, useCallback } from 'react';

interface UseHieroBatchOptions {
  config: BatchTransactionConfig;
}

interface UseHieroBatchReturn {
  compileBatch: (
    transactions: Transaction[],
    payerAccountId: AccountId | string
  ) => Promise<BatchCompilationResult>;
  isCompiling: boolean;
  error: Error | null;
  result: BatchCompilationResult | null;
}

export function useHieroBatch(options: UseHieroBatchOptions): UseHieroBatchReturn {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<BatchCompilationResult | null>(null);

  const compileBatch = useCallback(
    async (transactions: Transaction[], payerAccountId: AccountId | string) => {
      setIsCompiling(true);
      setError(null);

      try {
        const compiler = new BatchCompiler(options.config);
        const compiled = compiler.compile(transactions, payerAccountId);
        setResult(compiled);
        return compiled;
      } catch (err) {
        const caught = err instanceof Error ? err : new Error('Unknown error');
        setError(caught);
        throw caught;
      } finally {
        setIsCompiling(false);
      }
    },
    [options.config]
  );

  return { compileBatch, isCompiling, error, result };
}
