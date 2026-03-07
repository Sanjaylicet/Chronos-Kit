/**
 * Unit tests for Chronos-Kit custom error classes
 */

import { describe, it, expect } from 'vitest';

import {
    ChronosError,
    BatchSizeExceededError,
    TransactionCountExceededError,
    InsufficientBalanceError,
    PreFlightValidationError,
    MirrorNodeError,
} from '../errors';

describe('ChronosError', () => {
    it('sets name to ChronosError', () => {
        const err = new ChronosError('something failed', 'GENERIC_ERROR');
        expect(err.name).toBe('ChronosError');
    });

    it('exposes the error code', () => {
        const err = new ChronosError('test', 'TEST_CODE');
        expect(err.code).toBe('TEST_CODE');
    });

    it('is an instance of Error', () => {
        const err = new ChronosError('test', 'TEST_CODE');
        expect(err).toBeInstanceOf(Error);
    });

    it('carries the message', () => {
        const err = new ChronosError('my message', 'CODE');
        expect(err.message).toBe('my message');
    });
});

describe('BatchSizeExceededError', () => {
    it('has the BATCH_SIZE_EXCEEDED code', () => {
        const err = new BatchSizeExceededError(7000, 6144);
        expect(err.code).toBe('BATCH_SIZE_EXCEEDED');
    });

    it('includes size and limit in message', () => {
        const err = new BatchSizeExceededError(7000, 6144);
        expect(err.message).toContain('7000');
        expect(err.message).toContain('6144');
    });

    it('is an instance of ChronosError', () => {
        const err = new BatchSizeExceededError(7000, 6144);
        expect(err).toBeInstanceOf(ChronosError);
    });
});

describe('TransactionCountExceededError', () => {
    it('has the TRANSACTION_COUNT_EXCEEDED code', () => {
        const err = new TransactionCountExceededError(55, 50);
        expect(err.code).toBe('TRANSACTION_COUNT_EXCEEDED');
    });

    it('includes actual count and limit in message', () => {
        const err = new TransactionCountExceededError(55, 50);
        expect(err.message).toContain('55');
        expect(err.message).toContain('50');
    });
});

describe('InsufficientBalanceError', () => {
    it('has the INSUFFICIENT_BALANCE code', () => {
        const err = new InsufficientBalanceError('5000000', '1000000');
        expect(err.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('includes required and available values in message', () => {
        const err = new InsufficientBalanceError('5000000', '1000000');
        expect(err.message).toContain('5000000');
        expect(err.message).toContain('1000000');
    });
});

describe('PreFlightValidationError', () => {
    it('has the PREFLIGHT_VALIDATION_FAILED code', () => {
        const err = new PreFlightValidationError('account not found');
        expect(err.code).toBe('PREFLIGHT_VALIDATION_FAILED');
    });

    it('wraps message with preflight context', () => {
        const err = new PreFlightValidationError('account not found');
        expect(err.message).toContain('Pre-flight validation failed');
        expect(err.message).toContain('account not found');
    });
});

describe('MirrorNodeError', () => {
    it('has the MIRROR_NODE_ERROR code', () => {
        const err = new MirrorNodeError('connection refused', 503);
        expect(err.code).toBe('MIRROR_NODE_ERROR');
    });

    it('exposes the HTTP status code', () => {
        const err = new MirrorNodeError('not found', 404);
        expect(err.statusCode).toBe(404);
    });

    it('works without a status code', () => {
        const err = new MirrorNodeError('network error');
        expect(err.statusCode).toBeUndefined();
        expect(err.code).toBe('MIRROR_NODE_ERROR');
    });

    it('wraps message with mirror node context', () => {
        const err = new MirrorNodeError('timeout');
        expect(err.message).toContain('Mirror node error');
        expect(err.message).toContain('timeout');
    });
});
