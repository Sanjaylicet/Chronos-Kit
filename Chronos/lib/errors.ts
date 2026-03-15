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
