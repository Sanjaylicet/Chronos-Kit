/**
 * Unit tests for Chronos-Kit core utility functions
 */

import { AccountId } from '@hashgraph/sdk';
import { describe, it, expect } from 'vitest';

import { HIERO_LIMITS } from '../types';
import {
    normalizeAccountId,
    tinybarsToHbar,
    hbarToTinybars,
    formatAccountBalance,
    validateBatchSize,
    validateTransactionCount,
    estimateBatchFee,
    safeJsonParse,
    delay,
} from '../utils';

describe('normalizeAccountId', () => {
    it('converts a string account ID to AccountId instance', () => {
        const result = normalizeAccountId('0.0.12345');
        expect(result).toBeInstanceOf(AccountId);
        expect(result.toString()).toBe('0.0.12345');
    });

    it('returns the same AccountId instance when already an AccountId', () => {
        const original = AccountId.fromString('0.0.999');
        const result = normalizeAccountId(original);
        expect(result).toBe(original);
    });

    it('throws on malformed account ID string', () => {
        expect(() => normalizeAccountId('not.an.id')).toThrow();
    });
});

describe('tinybarsToHbar', () => {
    it('converts 100_000_000 tinybars to 1 HBAR', () => {
        expect(tinybarsToHbar(100_000_000)).toBe(1);
    });

    it('converts 0 tinybars to 0 HBAR', () => {
        expect(tinybarsToHbar(0)).toBe(0);
    });

    it('converts fractional tinybars correctly', () => {
        expect(tinybarsToHbar(50_000_000)).toBe(0.5);
    });
});

describe('hbarToTinybars', () => {
    it('converts 1 HBAR to 100_000_000 tinybars', () => {
        expect(hbarToTinybars(1)).toBe(100_000_000);
    });

    it('rounds down fractional results', () => {
        // 0.123456789 HBAR → 12345678.9 → floor → 12345678
        expect(hbarToTinybars(0.123456789)).toBe(12345678);
    });

    it('is inverse of tinybarsToHbar for whole HBAR values', () => {
        expect(hbarToTinybars(tinybarsToHbar(200_000_000))).toBe(200_000_000);
    });
});

describe('formatAccountBalance', () => {
    it('formats balance with HBAR symbol', () => {
        const result = formatAccountBalance(100_000_000);
        expect(result).toBe('1.00000000 ℏ');
    });

    it('formats zero balance', () => {
        expect(formatAccountBalance(0)).toBe('0.00000000 ℏ');
    });
});

describe('validateBatchSize', () => {
    it('returns true when size is within limit', () => {
        expect(validateBatchSize(1024, HIERO_LIMITS.MAX_BATCH_SIZE)).toBe(true);
    });

    it('returns true when size equals limit exactly (boundary)', () => {
        expect(validateBatchSize(HIERO_LIMITS.MAX_BATCH_SIZE, HIERO_LIMITS.MAX_BATCH_SIZE)).toBe(true);
    });

    it('returns false when size exceeds 6KB limit', () => {
        expect(validateBatchSize(6145, HIERO_LIMITS.MAX_BATCH_SIZE)).toBe(false);
    });
});

describe('validateTransactionCount', () => {
    it('returns true for 1 transaction', () => {
        expect(validateTransactionCount(1, HIERO_LIMITS.MAX_BATCH_TRANSACTIONS)).toBe(true);
    });

    it('returns true for exactly 50 transactions (boundary)', () => {
        expect(validateTransactionCount(50, HIERO_LIMITS.MAX_BATCH_TRANSACTIONS)).toBe(true);
    });

    it('returns false for 51 transactions', () => {
        expect(validateTransactionCount(51, HIERO_LIMITS.MAX_BATCH_TRANSACTIONS)).toBe(false);
    });

    it('returns false for 0 transactions', () => {
        expect(validateTransactionCount(0, HIERO_LIMITS.MAX_BATCH_TRANSACTIONS)).toBe(false);
    });

    it('returns false for negative count', () => {
        expect(validateTransactionCount(-1, HIERO_LIMITS.MAX_BATCH_TRANSACTIONS)).toBe(false);
    });
});

describe('estimateBatchFee', () => {
    it('returns a positive number for valid inputs', () => {
        const fee = estimateBatchFee(5, 500);
        expect(fee).toBeGreaterThan(0);
    });

    it('scales linearly with transaction count', () => {
        const fee1 = estimateBatchFee(1, 100);
        const fee5 = estimateBatchFee(5, 100);
        expect(fee5).toBe(fee1 * 5);
    });

    it('increases with larger serialized size', () => {
        const feeSmall = estimateBatchFee(1, 100);
        const feeLarge = estimateBatchFee(1, 1000);
        expect(feeLarge).toBeGreaterThan(feeSmall);
    });
});

describe('safeJsonParse', () => {
    it('parses valid JSON and returns typed result', () => {
        const result = safeJsonParse<{ id: number }>('{"id":42}');
        expect(result).toEqual({ id: 42 });
    });

    it('returns null for invalid JSON without throwing', () => {
        const result = safeJsonParse('{ not valid json');
        expect(result).toBeNull();
    });
});

describe('delay', () => {
    it('resolves after the specified duration', async () => {
        const start = Date.now();
        await delay(50);
        const elapsed = Date.now() - start;
        // Allow ±20ms jitter in test environment
        expect(elapsed).toBeGreaterThanOrEqual(40);
    });
});

describe('HIERO_LIMITS constants', () => {
    it('MAX_BATCH_SIZE is exactly 6144 bytes (6KB)', () => {
        expect(HIERO_LIMITS.MAX_BATCH_SIZE).toBe(6144);
    });

    it('MAX_BATCH_TRANSACTIONS is exactly 50', () => {
        expect(HIERO_LIMITS.MAX_BATCH_TRANSACTIONS).toBe(50);
    });

    it('DEFAULT_PAGE_SIZE is 100', () => {
        expect(HIERO_LIMITS.DEFAULT_PAGE_SIZE).toBe(100);
    });
});
