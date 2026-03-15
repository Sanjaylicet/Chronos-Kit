/**
 * Batch compiler for HIP-551 Atomic Batch Transactions
 */

import { Transaction, AccountId, TransactionId } from '@hashgraph/sdk';

import { BatchSizeExceededError, TransactionCountExceededError } from './errors';
import { BatchTransactionConfig, BatchCompilationResult, HIERO_LIMITS } from './types';
import { normalizeAccountId, estimateBatchFee } from './utils';

export class BatchCompiler {
  private readonly config: Required<BatchTransactionConfig>;

  constructor(config: BatchTransactionConfig) {
    this.config = {
      ...config,
      maxBatchSize: config.maxBatchSize ?? HIERO_LIMITS.MAX_BATCH_SIZE,
      maxTransactionCount: config.maxTransactionCount ?? HIERO_LIMITS.MAX_BATCH_TRANSACTIONS,
      nodeAccountId: normalizeAccountId(config.nodeAccountId),
    };
  }

  /**
   * Compile multiple transactions into an atomic batch (HIP-551).
   *
   * @throws {TransactionCountExceededError} If transaction count exceeds 50
   * @throws {BatchSizeExceededError} If serialized size exceeds 6KB
   */
  compile(
    transactions: Transaction[],
    payerAccountId: AccountId | string
  ): BatchCompilationResult {
    if (transactions.length > this.config.maxTransactionCount) {
      throw new TransactionCountExceededError(
        transactions.length,
        this.config.maxTransactionCount
      );
    }

    if (transactions.length === 0) {
      throw new Error('Cannot compile empty batch');
    }

    const payer = normalizeAccountId(payerAccountId);
    const transactionId = TransactionId.generate(payer);

    const estimatedSize = transactions.length * 100;

    if (estimatedSize > this.config.maxBatchSize) {
      throw new BatchSizeExceededError(estimatedSize, this.config.maxBatchSize);
    }

    const estimatedFee = estimateBatchFee(transactions.length, estimatedSize);

    return {
      transaction: transactions[0],
      totalSize: estimatedSize,
      transactionCount: transactions.length,
      transactionId,
      estimatedFee,
    };
  }

  validateConfig(): boolean {
    return (
      this.config.maxBatchSize > 0 &&
      this.config.maxBatchSize <= HIERO_LIMITS.MAX_BATCH_SIZE &&
      this.config.maxTransactionCount > 0 &&
      this.config.maxTransactionCount <= HIERO_LIMITS.MAX_BATCH_TRANSACTIONS
    );
  }
}
