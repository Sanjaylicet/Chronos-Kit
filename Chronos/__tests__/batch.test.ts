import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferTransaction } from '@hashgraph/sdk';

import { BatchCompiler } from '../lib/batch';
import { EmptyBatchError, TransactionOversizeError } from '../lib/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a plain, unfrozen TransferTransaction suitable for `add()`. */
function makeTx(): TransferTransaction {
  return new TransferTransaction();
}

/**
 * Create a TransferTransaction whose `toBytes()` is stubbed to report a
 * specific byte length.  The underlying transaction object is real and can
 * still be frozen and added to a BatchTransaction by compile().
 */
function makeTxWithSize(bytes: number): TransferTransaction {
  const tx = new TransferTransaction();
  vi.spyOn(tx, 'toBytes').mockReturnValue(new Uint8Array(bytes));
  return tx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BatchCompiler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. EmptyBatchError ────────────────────────────────────────────────────

  it('throws EmptyBatchError when compile() is called with no transactions', () => {
    const compiler = new BatchCompiler();
    expect(() => compiler.compile()).toThrowError(EmptyBatchError);
  });

  // ── 2. TransactionOversizeError ───────────────────────────────────────────

  it('throws TransactionOversizeError when a single tx exceeds 5900 bytes', () => {
    const compiler = new BatchCompiler();
    const tx = makeTxWithSize(5_901);

    expect(() => compiler.add(tx)).toThrowError(TransactionOversizeError);

    // Confirm the error carries the byte count
    try {
      compiler.add(makeTxWithSize(6_000));
    } catch (err) {
      expect(err).toBeInstanceOf(TransactionOversizeError);
      expect((err as TransactionOversizeError).byteCount).toBe(6_000);
    }
  });

  it('accepts a tx that is exactly at the 5900-byte limit', () => {
    const compiler = new BatchCompiler();
    // Should not throw
    expect(() => compiler.add(makeTxWithSize(5_900))).not.toThrow();
  });

  // ── 3. estimateByteSize ───────────────────────────────────────────────────

  it('estimateByteSize() accumulates byte counts of added transactions', () => {
    const compiler = new BatchCompiler();
    compiler.add(makeTxWithSize(100));
    compiler.add(makeTxWithSize(200));
    compiler.add(makeTxWithSize(50));
    expect(compiler.estimateByteSize()).toBe(350);
  });

  // ── 4. Count-based chunking: 51 → 2 batches (50 + 1) ────────────────────

  it('chunks 51 transactions into exactly 2 batches of 50 and 1', () => {
    const compiler = new BatchCompiler();
    for (let i = 0; i < 51; i++) {
      compiler.add(makeTx());
    }

    const batches = compiler.compile();

    expect(batches).toHaveLength(2);
    expect(batches[0].innerTransactions).toHaveLength(50);
    expect(batches[1].innerTransactions).toHaveLength(1);
  });

  // ── 5. Byte-based chunking: split at the 5900-byte boundary ──────────────

  it('splits into a new chunk when adding a tx would exceed 5900 bytes', () => {
    // tx1 + tx2 combined = 6000 bytes → must be split.
    // tx3 fits alongside tx2 (3000 + 100 = 3100 ≤ 5900).
    const compiler = new BatchCompiler();
    compiler.add(makeTxWithSize(3_000)); // chunk 1: [tx1] = 3000 bytes
    compiler.add(makeTxWithSize(3_000)); // 3000+3000=6000 > 5900 → new chunk; chunk 2: [tx2]
    compiler.add(makeTxWithSize(100));   // 3000+100=3100 ≤ 5900 → appended to chunk 2

    const batches = compiler.compile();

    expect(batches).toHaveLength(2);
    expect(batches[0].innerTransactions).toHaveLength(1);
    expect(batches[1].innerTransactions).toHaveLength(2);
  });

  // ── 6. nodeAccountIds[0] is 0.0.0 on every inner transaction ─────────────

  it('sets nodeAccountIds[0] to 0.0.0 on every inner transaction', () => {
    const compiler = new BatchCompiler();
    compiler.add(makeTx()).add(makeTx()).add(makeTx());

    const batches = compiler.compile();

    for (const batch of batches) {
      for (const inner of batch.innerTransactions) {
        expect(inner.nodeAccountIds?.[0]?.toString()).toBe('0.0.0');
      }
    }
  });

  // ── 7. batchKey is present on every inner transaction ────────────────────

  it('sets batchKey on every inner transaction', () => {
    const compiler = new BatchCompiler();
    compiler.add(makeTx()).add(makeTx());

    const batches = compiler.compile();

    for (const batch of batches) {
      for (const inner of batch.innerTransactions) {
        expect(inner.batchKey).not.toBeNull();
      }
    }
  });

  // ── 8. batchKey is NOT set on the outer BatchTransaction ──────────────────

  it('does not set batchKey on the outer BatchTransaction', () => {
    const compiler = new BatchCompiler();
    compiler.add(makeTx());

    const [batch] = compiler.compile();

    expect(batch.batchKey).toBeNull();
  });

  // ── 9. All inner transactions in a chunk share the same batchKey ──────────

  it('inner transactions within a chunk share the same batchKey', () => {
    const compiler = new BatchCompiler();
    compiler.add(makeTx()).add(makeTx()).add(makeTx());

    const [batch] = compiler.compile();
    const keys = batch.innerTransactions.map((tx) => tx.batchKey?.toString());

    expect(new Set(keys).size).toBe(1);
  });

  // ── 10. Different chunks get different batchKeys ──────────────────────────

  it('different chunks receive distinct batchKeys', () => {
    // Force 2 chunks by count (51 transactions)
    const compiler = new BatchCompiler();
    for (let i = 0; i < 51; i++) {
      compiler.add(makeTx());
    }

    const [batch1, batch2] = compiler.compile();

    const key1 = batch1.innerTransactions[0].batchKey?.toString();
    const key2 = batch2.innerTransactions[0].batchKey?.toString();

    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
  });

  // ── 11. Fluent add() chaining ─────────────────────────────────────────────

  it('add() is chainable and returns the compiler instance', () => {
    const compiler = new BatchCompiler();
    const result = compiler.add(makeTx()).add(makeTx());
    expect(result).toBe(compiler);
  });
});
