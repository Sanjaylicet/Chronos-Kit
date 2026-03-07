/**
 * Utility functions for Chronos-Kit
 */

import { AccountId } from '@hashgraph/sdk';

/**
 * Validates and normalizes an account ID
 */
export function normalizeAccountId(accountId: AccountId | string): AccountId {
  if (typeof accountId === 'string') {
    return AccountId.fromString(accountId);
  }
  return accountId;
}

/**
 * Calculates the estimated fee for a batch transaction
 * This is a simplified estimation - actual fees depend on network congestion
 */
export function estimateBatchFee(transactionCount: number, avgSize: number): number {
  // Base fee per transaction (estimated at 0.0001 HBAR = 10000 tinybars)
  const baseFeePerTx = 10000;
  // Additional fee based on size (1 tinybar per 10 bytes)
  const sizeFee = Math.ceil(avgSize / 10);
  return transactionCount * (baseFeePerTx + sizeFee);
}

/**
 * Converts tinybars to HBAR
 */
export function tinybarsToHbar(tinybars: number): number {
  return tinybars / 100_000_000;
}

/**
 * Converts HBAR to tinybars
 */
export function hbarToTinybars(hbar: number): number {
  return Math.floor(hbar * 100_000_000);
}

/**
 * Formats an account balance for display
 */
export function formatAccountBalance(tinybars: number): string {
  const hbar = tinybarsToHbar(tinybars);
  return `${hbar.toFixed(8)} ℏ`;
}

/**
 * Validates batch size against limits
 */
export function validateBatchSize(size: number, limit: number): boolean {
  return size <= limit;
}

/**
 * Validates transaction count against limits
 */
export function validateTransactionCount(count: number, limit: number): boolean {
  return count > 0 && count <= limit;
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Delay utility for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
