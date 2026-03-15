/**
 * BatchCompiler — HIP-551 Atomic Batch Transaction builder
 *
 * Accumulates arbitrary @hashgraph/sdk Transaction subclasses, groups them into
 * chunks that satisfy both the 5 900-byte and 50-transaction-per-batch limits,
 * then returns ready-to-sign BatchTransaction objects.
 */

import {
  AccountId,
  BatchTransaction,
  PrivateKey,
  Transaction,
  TransactionId,
} from '@hashgraph/sdk';

import { BatchKeyOnOuterError, EmptyBatchError, TransactionOversizeError } from './errors';

const MAX_BYTES = 5_900;
const MAX_COUNT = 50;

interface Entry {
  tx: Transaction;
  byteSize: number;
}

export class BatchCompiler {
  private readonly entries: Entry[] = [];
  private accumulatedBytes = 0;

  /**
   * Adds a transaction to the compiler.
   *
   * Serialises the transaction immediately via `toBytes()` to measure its size.
   *
   * @throws {TransactionOversizeError} if the single transaction exceeds 5 900 bytes.
   */
  add(tx: Transaction): this {
    const byteSize = tx.toBytes().length;
    if (byteSize > MAX_BYTES) {
      throw new TransactionOversizeError(byteSize);
    }
    this.entries.push({ tx, byteSize });
    this.accumulatedBytes += byteSize;
    return this;
  }

  /**
   * Groups accumulated transactions into `BatchTransaction` chunks, each
   * satisfying both the byte cap (≤ 5 900) and the count cap (≤ 50).
   *
   * For every inner transaction the compiler:
   *   1. Calls `tx.setBatchKey(batchKey)` with a freshly generated PrivateKey
   *      that is unique to this compile call and shared across all inner
   *      transactions of the same chunk.
   *   2. Generates a `TransactionId` when one is not already present.
   *   3. Calls `tx.freeze()`, which causes the SDK to automatically set
   *      `nodeAccountIds` to `[0.0.0]` (the canonical batch routing sentinel).
   *
   * The `batchKey` is intentionally NOT set on the outer `BatchTransaction`;
   * it lives only on the inner transactions so signers can verify the batch.
   *
   * @throws {EmptyBatchError}       if no transactions have been added.
   * @throws {BatchKeyOnOuterError}  if a `batchKey` is detected on the outer
   *                                 BatchTransaction (safety invariant).
   */
  compile(): BatchTransaction[] {
    if (this.entries.length === 0) {
      throw new EmptyBatchError();
    }

    // ── Greedy chunking ────────────────────────────────────────────────────
    const chunks: Entry[][] = [];
    let currentChunk: Entry[] = [];
    let currentBytes = 0;

    for (const entry of this.entries) {
      const wouldExceedBytes =
        currentChunk.length > 0 && currentBytes + entry.byteSize > MAX_BYTES;
      const wouldExceedCount = currentChunk.length >= MAX_COUNT;

      if (wouldExceedBytes || wouldExceedCount) {
        chunks.push(currentChunk);
        currentChunk = [];
        currentBytes = 0;
      }

      currentChunk.push(entry);
      currentBytes += entry.byteSize;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    // ── Build one BatchTransaction per chunk ───────────────────────────────
    return chunks.map((chunk) => {
      // One fresh PrivateKey per chunk — shared across all inner transactions
      // of this chunk so that a single batch-key signature covers them all.
      const batchKey = PrivateKey.generateED25519();

      for (const { tx } of chunk) {
        // setBatchKey must come before freeze() so that the SDK's freeze()
        // implementation automatically routes the transaction to node 0.0.0.
        tx.setBatchKey(batchKey);

        // Generate a placeholder TransactionId when the caller has not set one.
        if (!tx.transactionId) {
          tx.setTransactionId(TransactionId.generate(new AccountId(0, 0, 2)));
        }

        // freeze() detects the batchKey and sets nodeAccountIds = [0.0.0].
        tx.freeze();
      }

      const outerBatch = new BatchTransaction();

      // Safety invariant: the outer container must never carry a batchKey.
      if (outerBatch.batchKey !== null) {
        throw new BatchKeyOnOuterError();
      }

      for (const { tx } of chunk) {
        outerBatch.addInnerTransaction(tx);
      }

      // Second guard: addInnerTransaction must not have side-effected batchKey.
      if (outerBatch.batchKey !== null) {
        throw new BatchKeyOnOuterError();
      }

      return outerBatch;
    });
  }

  /**
   * Returns the total byte count accumulated so far without triggering a
   * compile pass.
   */
  estimateByteSize(): number {
    return this.accumulatedBytes;
  }
}

