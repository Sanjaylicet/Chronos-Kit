/**
 * Custom error types for Chronos-Kit
 */

export class ChronosError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'ChronosError';
  }
}

export class BatchSizeExceededError extends ChronosError {
  constructor(size: number, limit: number) {
    super(
      `Batch size ${size} bytes exceeds the maximum limit of ${limit} bytes`,
      'BATCH_SIZE_EXCEEDED'
    );
    this.name = 'BatchSizeExceededError';
  }
}

export class TransactionCountExceededError extends ChronosError {
  constructor(count: number, limit: number) {
    super(
      `Transaction count ${count} exceeds the maximum limit of ${limit} transactions`,
      'TRANSACTION_COUNT_EXCEEDED'
    );
    this.name = 'TransactionCountExceededError';
  }
}

export class InsufficientBalanceError extends ChronosError {
  constructor(required: string, available: string) {
    super(
      `Insufficient balance: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE'
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class PreFlightValidationError extends ChronosError {
  constructor(message: string) {
    super(`Pre-flight validation failed: ${message}`, 'PREFLIGHT_VALIDATION_FAILED');
    this.name = 'PreFlightValidationError';
  }
}

export class MirrorNodeError extends ChronosError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly path?: string
  ) {
    super(`Mirror node error: ${message}`, 'MIRROR_NODE_ERROR');
    this.name = 'MirrorNodeError';
  }
}

export class SSRFBlockedError extends ChronosError {
  constructor(url: string, reason: string) {
    super(`Blocked mirror node URL "${url}": ${reason}`, 'SSRF_BLOCKED');
    this.name = 'SSRFBlockedError';
  }
}

export class TransactionOversizeError extends ChronosError {
  constructor(public readonly byteCount: number) {
    super(
      `Transaction serializes to ${byteCount} bytes, exceeding the 5900-byte limit`,
      'TRANSACTION_OVERSIZE'
    );
    this.name = 'TransactionOversizeError';
  }
}

export class BatchKeyOnOuterError extends ChronosError {
  constructor() {
    super(
      'batchKey must not be set on the outer BatchTransaction',
      'BATCH_KEY_ON_OUTER'
    );
    this.name = 'BatchKeyOnOuterError';
  }
}

export class EmptyBatchError extends ChronosError {
  constructor() {
    super('compile() was called with no transactions added', 'EMPTY_BATCH');
    this.name = 'EmptyBatchError';
  }
}

export class SchedulePastDateError extends ChronosError {
  constructor(public readonly date: Date) {
    super(
      `executeAt date ${date.toISOString()} is in the past`,
      'SCHEDULE_PAST_DATE',
    );
    this.name = 'SchedulePastDateError';
  }
}

export class NestedScheduleError extends ChronosError {
  constructor(reason: string) {
    super(reason, 'NESTED_SCHEDULE');
    this.name = 'NestedScheduleError';
  }
}
