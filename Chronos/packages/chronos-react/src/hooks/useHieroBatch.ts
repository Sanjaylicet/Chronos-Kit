/**
 * React hook for creating atomic batch transactions
 */

import {
  BatchCompiler,
  BatchTransactionConfig,
  BatchCompilationResult,
} from '@chronos-kit/core';
import { Transaction, AccountId } from '@hashgraph/sdk';
import { useState, useCallback } from 'react';

interface UseHieroBatchOptions {
  config: BatchTransactionConfig;
}

interface UseHieroBatchReturn {
  /** Compile transactions into a batch */
  compileBatch: (
    transactions: Transaction[],
    payerAccountId: AccountId | string
  ) => Promise<BatchCompilationResult>;
  /** Loading state */
  isCompiling: boolean;
  /** Error state */
  error: Error | null;
  /** Last compiled result */
  result: BatchCompilationResult | null;
}

/**
 * Hook for creating HIP-551 atomic batch transactions
 * 
 * @param options - Batch configuration options
 * @returns Batch compilation utilities
 * 
 * @example
 * ```tsx
 * function BatchTransaction() {
 *   const { compileBatch, isCompiling, error, result } = useHieroBatch({
 *     config: {
 *       nodeAccountId: '0.0.3',
 *       batchKey: myPrivateKey,
 *     }
 *   });
 *   
 *   const handleCreateBatch = async () => {
 *     const result = await compileBatch([tx1, tx2, tx3], payerAccountId);
 *     console.log('Batch compiled:', result);
 *   };
 *   
 *   return <button onClick={handleCreateBatch}>Create Batch</button>;
 * }
 * ```
 */
export function useHieroBatch(options: UseHieroBatchOptions): UseHieroBatchReturn {
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<BatchCompilationResult | null>(null);

  const compiler = new BatchCompiler(options.config);

  const compileBatch = useCallback(
    async (transactions: Transaction[], payerAccountId: AccountId | string) => {
      setIsCompiling(true);
      setError(null);

      try {
        const compiledResult = compiler.compile(transactions, payerAccountId);
        setResult(compiledResult);
        return compiledResult;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        throw error;
      } finally {
        setIsCompiling(false);
      }
    },
    [compiler]
  );

  return {
    compileBatch,
    isCompiling,
    error,
    result,
  };
}
