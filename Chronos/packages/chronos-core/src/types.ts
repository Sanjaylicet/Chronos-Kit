/**
 * Core type definitions for Chronos-Kit
 */

import { AccountId, Transaction, TransactionId, PrivateKey } from '@hashgraph/sdk';

/**
 * Configuration for the Hiero network connection
 */
export interface HieroNetworkConfig {
  /** Network identifier: mainnet, testnet, previewnet, or custom */
  network: 'mainnet' | 'testnet' | 'previewnet' | 'custom';
  /** Mirror node REST API base URL */
  mirrorNodeUrl: string;
  /** Optional custom node configuration for consensus nodes */
  nodes?: Record<string, AccountId | string>;
}

/**
 * Atomic Batch Transaction configuration (HIP-551)
 */
export interface BatchTransactionConfig {
  /** Node account ID to execute the batch */
  nodeAccountId: AccountId | string;
  /** Private key for batch signing (batchKey) */
  batchKey: PrivateKey;
  /** Maximum allowed batch size in bytes (default: 6144 = 6KB) */
  maxBatchSize?: number;
  /** Maximum allowed transaction count (default: 50) */
  maxTransactionCount?: number;
}

/**
 * Scheduled Transaction configuration (HIP-423)
 */
export interface ScheduleTransactionConfig {
  /** Payer account for the scheduled transaction */
  payerAccountId: AccountId | string;
  /** Optional admin key for schedule management */
  adminKey?: PrivateKey;
  /** Optional expiration time for the schedule */
  expirationTime?: Date;
  /** Whether to wait for expiry (default: false) */
  waitForExpiry?: boolean;
}

/**
 * Account balance information from Mirror Node
 */
export interface AccountBalance {
  /** Account identifier */
  account: string;
  /** HBAR balance in tinybars */
  balance: number;
  /** Token balances */
  tokens?: TokenBalance[];
  /** Timestamp of balance */
  timestamp: string;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Token ID */
  token_id: string;
  /** Balance amount */
  balance: number;
  /** Number of decimals */
  decimals?: number;
}

/**
 * Mirror Node pagination response
 */
export interface MirrorNodeResponse<T> {
  /** Pagination links */
  links: {
    next: string | null;
  };
  /** Data items - can be any key */
  [key: string]: T[] | { next: string | null };
}

/**
 * Transaction history item from Mirror Node
 */
export interface TransactionHistoryItem {
  /** Consensus timestamp */
  consensus_timestamp: string;
  /** Transaction ID */
  transaction_id: string;
  /** Transaction type */
  name: string;
  /** Result status */
  result: string;
  /** Charged transaction fee */
  charged_tx_fee: number;
  /** Transaction memo */
  memo_base64?: string;
}

/**
 * Pre-flight validation result
 */
export interface PreFlightValidationResult {
  /** Whether validation passed */
  success: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Estimated total fee in tinybars */
  estimatedFee?: number;
  /** Account balance in tinybars */
  accountBalance?: number;
  /** Detailed validation checks */
  checks: {
    sufficientBalance: boolean;
    validBatchSize: boolean;
    validTransactionCount: boolean;
    nodeAccountValid: boolean;
  };
}

/**
 * Batch compilation result
 */
export interface BatchCompilationResult {
  /** Compiled batch transaction ready for submission */
  transaction: Transaction;
  /** Total serialized size in bytes */
  totalSize: number;
  /** Number of inner transactions */
  transactionCount: number;
  /** Transaction ID */
  transactionId: TransactionId;
  /** Estimated fee in tinybars */
  estimatedFee: number;
}

/**
 * Constants for Hiero network limits
 */
export const HIERO_LIMITS = {
  /** Maximum batch size in bytes (6KB) */
  MAX_BATCH_SIZE: 6144,
  /** Maximum inner transactions per batch */
  MAX_BATCH_TRANSACTIONS: 50,
  /** Default Mirror Node pagination limit */
  DEFAULT_PAGE_SIZE: 100,
} as const;
